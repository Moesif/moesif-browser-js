/**
 * Created by Xingheng
 */

import { _, console, userAgent, localStorageSupported, JSONStringify, quick_hash } from './utils';
import patchAjaxWithCapture from './capture';
import patchWeb3WithCapture from './web3capture';
import patchFetchWithCapture from './capture-fetch';
import decorateLinksForCrossDomainTracking from './cross-domain-tracking';
import {
  getCampaignDataFromUrlOrCookie,
  storeCampaignDataIfNeeded,
  popStoredCampaignDataForUser,
  popStoredCampaignDataForCompany
} from './campaign';
import Config from './config';
import { RequestBatcher } from './request-batcher';
import {
  getPersistenceFunction,
  getFromPersistence,
  clearCookies,
  STORAGE_CONSTANTS,
  clearLocalStorage,
  getFromLocalStorageOnly,
  saveToLocalStorageOnly,
  removeFromLocalStorageOnly
} from './persistence';
import { getAnonymousId, regenerateAnonymousId } from './anonymousId';

var MOESIF_CONSTANTS = {
  //The base Uri for API calls
  HOST: 'api.moesif.net',
  EVENT_ENDPOINT: '/v1/events',
  EVENT_BATCH_ENDPOINT: '/v1/events/batch',
  ACTION_ENDPOINT: '/v1/actions',
  ACTION_BATCH_ENDPOINT: '/v1/actions/batch',
  USER_ENDPOINT: '/v1/users',
  COMPANY_ENDPOINT: '/v1/companies'
};

// http://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
// https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#withCredentials
var USE_XHR = (window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest());
// IE<10 does not support cross-origin XHR's but script tags
// with defer won't block window.onload; ENQUEUE_REQUESTS
// should only be true for Opera<12

var ENQUEUE_REQUESTS = !USE_XHR && (userAgent.indexOf('MSIE') === -1) && (userAgent.indexOf('Mozilla') === -1);

var NOOP = function() {};

// save reference to navigator.sendBeacon so it can be minified
var sendBeacon = null;
if (navigator['sendBeacon']) {
  sendBeacon = function () {
    // late reference to navigator.sendBeacon to allow patching/spying
    return navigator['sendBeacon'].apply(navigator, arguments);
  };
}

var HTTP_PROTOCOL = (('http:' === (document && document.location.protocol)) ? 'http://' : 'https://');

function isContentJson(event) {
  try {
    var contentType = event['request']['headers']['Content-Type'] || event['request']['headers']['content-type']
      || event['response']['headers']['Content-Type'] || event['response']['headers']['content-type'];

    return contentType && contentType.toLowerCase().indexOf('json') > 0;
  } catch (err) {
    return false;
  }
}

function isMoesif(event) {
  try {
    return event['request']['headers']['X-Moesif-SDK'];
  } catch(err) {
    return false;
  }
}

function ensureValidOptions(options) {
  if (!options) throw new Error('options are required by moesif-browser-js middleware');
  if (!options['applicationId']) throw new Error('A moesif application id is required. Please obtain it through your settings at www.moesif.com');

  if (options['getTags'] && !_.isFunction(options['getTags'])) {
    throw new Error('getTags should be a function');
  }
  if (options['getMetadata'] && !_.isFunction(options['getMetadata'])) {
    throw new Error('getMetadata should be a function');
  }
  if (options['getApiVersion'] && !_.isFunction(options['getApiVersion'])) {
    throw new Error('identifyUser should be a function');
  }
  if (options['maskContent'] && !_.isFunction(options['maskContent'])) {
    throw new Error('maskContent should be a function');
  }
  if (options['skip'] && !_.isFunction(options['skip'])) {
    throw new Error('skip should be a function');
  }
}

export default function () {
  console.log('moesif object creator is called');

  return {
    'init': function (options) {
      if (!window) {
        console.critical('Warning, this library need to be initiated on the client side');
      }

      ensureValidOptions(options);

      var ops = {};

      ops.getTags = options['getTags'] || NOOP;
      ops.maskContent = options['maskContent'] || function (eventData) {
        return eventData;
      };

      ops.getMetadata = options['getMetadata'] || NOOP;

      ops.skip = options['skip'] || function () {
        return false;
      };

      ops.debug = options['debug'];
      ops.callback = options['callback'] || NOOP;
      ops.applicationId = options['applicationId'];
      ops.apiVersion = options['apiVersion'];
      ops.disableFetch = options['disableFetch'];

      ops.disableReferrer = options['disableReferrer'];
      ops.disableGclid = options['disableGclid'];
      ops.disableUtm = options['disableUtm'];

      ops.eagerBodyLogging = options['eagerBodyLogging'];
      ops.host = options['host'] || MOESIF_CONSTANTS.HOST;

      ops.batchEnabled = options['batchEnabled'] || false;

      ops['batch_size'] = options['batchSize'] || 25,
      ops['batch_flush_interval_ms'] = options['batchMaxTime'] || 2500;
      ops['batch_request_timeout_ms'] = options['batchTimeout'] || 90000;
      ops['batch_storage_expiration'] = options['batchStorageExpiration'];

      // storage persistence based options.
      // cookie, localStorage, or none.
      ops['persistence'] = options['persistence'] || 'localStorage';

      // below persistence options only applies to cookie.
      ops['cross_site_cookie'] = options['crossSiteCookie']  || false;
      // the default value for this is true.
      ops['cross_subdomain_cookie'] = options['crossSubdomainCookie'] === false ? false : true;
      ops['cookie_expiration'] = options['cookieExpiration'] || 365;
      ops['secure_cookie'] = options['secureCookie'] || false;
      ops['cookie_domain'] = options['cookieDomain'] || '';
      ops['persistence_key_prefix'] = options['persistenceKeyPrefix'];

      // specify domains to be considered for cross domain tracking.
      ops.enableCrossDomainTracking = options['enableCrossDomainTracking'] || false;
      // crossDomainTargets: array of domains to decorate, null to decorate all domains, [] or undefined to decorate none
      ops.crossDomainTargets = Object.hasOwn(options, 'crossDomainTargets') ? options['crossDomainTargets'] : [];
      ops.crossDomainTrackingParameterName = ops.enableCrossDomainTracking ? (options['crossDomainTrackingParameterName'] || '__mt') : null;

      // consent management options
      ops.requirePublishingConsent = options['requirePublishingConsent'] || false;
      ops.maxQueueSize = options['maxQueueSize'] || 1000; // Max pending requests before consent

      this.requestBatchers = {};

      this._options = ops;
      this._persist = getPersistenceFunction(ops);

      // Initialize consent state and pending requests queue
      // If consent is not required, it's automatically granted
      this._publishingConsentGranted = !ops.requirePublishingConsent;
      this._pendingRequests = [];
      this._recordingActive = false; // Track if recording is active

      try {
        this._userId = getFromPersistence(STORAGE_CONSTANTS.STORED_USER_ID, ops);
        this._session = getFromPersistence(STORAGE_CONSTANTS.STORED_SESSION_ID, ops);
        this._companyId = getFromPersistence(STORAGE_CONSTANTS.STORED_COMPANY_ID, ops);
        this._anonymousId = getAnonymousId(this._persist, ops, ops.crossDomainTrackingParameterName);
        this._currentCampaign = getCampaignDataFromUrlOrCookie(ops);

        if (this._currentCampaign) {
          storeCampaignDataIfNeeded(this._persist, ops, this._currentCampaign);
        }

        // Load persisted pending requests queue if consent is required
        if (ops.requirePublishingConsent) {
          this._loadPersistedQueue();
        }

        // this._campaign = getCampaignData(this._persist, ops);

        // try to save campaign data on anonymous id
        // if there is no userId saved, means it is still anonymous.
        // later on, when identifyUser is called with real user id,
        // the campaigne data will be resent with that again.
        if (this._currentCampaign && !this._userId) {
          var anonUserObject = {};
          anonUserObject['anonymous_id'] = this._anonymousId;
          anonUserObject['campaign'] = this._currentCampaign;
          this.updateUser(anonUserObject, this._options.applicationId, this._options.host, this._options.callback);
        }
      } catch(err) {
        console.error('error loading saved data from local storage but continue');
      }

      if (ops.batchEnabled) {
        if (!localStorageSupported() || !USE_XHR) {
          ops.batchEnabled = false;
          console.log('Turning off batch processing because it needs XHR and localStorage');
        } else {
          this.initBatching();
          if (sendBeacon && window.addEventListener) {
            var flushOnClose = _.bind(function() {
              _.each(this.requestBatchers, function (batcher) {
                if (!batcher.stopped) {
                  batcher.flush({ sendBeacon: true });
                }
              });
            }, this);

            // some browsers do not support visibilitychange event.
            window.addEventListener('pagehide', function(ev) {
                flushOnClose();
            });

            window.addEventListener('visibilitychange', function() {
              if (document['visibilityState'] === 'hidden') {
                flushOnClose();
              }
            });
          }
        }
      }

      console.log('moesif initiated');
      return this;
    },
    _executeRequest: function (url, data, options, callback) {
      // options structure
      // {
      //   method: 'POST',
      //   verbose: true,
      //   ignore_json_errors: true, // eslint-disable-line camelcase
      //   timeout_ms: timeoutMS, // eslint-disable-line camelcase
      //   applicationId
      // };
      var token = (options && options.applicationId) || this._options.applicationId;
      var method = (options && options.method) || 'POST';

      // right now we onlu support USE_XHR
      try {
        var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance
        xmlhttp.open(method, url);
        xmlhttp.setRequestHeader('Content-Type', 'application/json');
        xmlhttp.setRequestHeader('X-Moesif-Application-Id', token);
        xmlhttp.setRequestHeader('X-Moesif-SDK', 'moesif-browser-js/' + Config.LIB_VERSION);

        if (options.timeout_ms && typeof xmlhttp.timeout !== 'undefined') {
          xmlhttp.timeout = options.timeout_ms;
          var startTime = new Date().getTime();
        }
        xmlhttp.onreadystatechange = function () {
          if (xmlhttp.readyState === 4) { // XMLHttpRequest.DONE == 4, except in safari 4
            if (xmlhttp.status >= 200 && xmlhttp.status <= 300) {
              if (callback) {
                var response = XMLHttpRequest.responseText;
                callback(response);
              }
            } else {
              var error;
              if (
                xmlhttp.timeout &&
                !xmlhttp.status &&
                new Date().getTime() - startTime >= xmlhttp.timeout
              ) {
                error = 'timeout';
              } else {
                error = 'Bad HTTP status: ' + xmlhttp.status + ' ' + xmlhttp.statusText;
              }
              console.error(error);
              if (callback) {
                callback({ status: 0, error: error, xhr_req: xmlhttp }); // eslint-disable-line camelcase
              }
            }
          }
        };

        xmlhttp.send(JSONStringify(data));
      } catch (err) {
        console.error('failed to send to moesif ' + (data && data['request'] && data['request']['uri']));
        console.error(err);
         if (callback) {
          callback({status: 0, error: err });
        }
      }
    },
    // Queue persistence helpers - uses localStorage only (not cookies)
    // Pending requests are page-specific, not user-specific
    _loadPersistedQueue: function() {
      try {
        var persistedQueue = getFromLocalStorageOnly(STORAGE_CONSTANTS.STORED_PENDING_REQUESTS, this._options);
        if (persistedQueue) {
          var parsed = JSON.parse(persistedQueue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this._pendingRequests = parsed;
            console.log('loaded ' + parsed.length + ' requests from persisted queue');
          }
        }
      } catch (err) {
        console.error('error loading persisted queue: ' + err);
        this._pendingRequests = [];
      }
    },
    _savePersistedQueue: function() {
      try {
        // Serialize queue without callbacks (callbacks can't be serialized)
        var serializableQueue = this._pendingRequests.map(function(req) {
          var copy = Object.assign({}, req);
          delete copy.callback; // Remove callback function
          return copy;
        });
        saveToLocalStorageOnly(STORAGE_CONSTANTS.STORED_PENDING_REQUESTS, JSON.stringify(serializableQueue), this._options);
      } catch (err) {
        console.error('error saving persisted queue: ' + err);
      }
    },
    _clearPersistedQueue: function() {
      try {
        removeFromLocalStorageOnly(STORAGE_CONSTANTS.STORED_PENDING_REQUESTS, this._options);
      } catch (err) {
        console.error('error clearing persisted queue: ' + err);
      }
    },
    _enqueueRequest: function(requestObject) {
      // Don't queue if recording is not active
      if (!this._recordingActive) {
        console.log('recording is not active, dropping request');
        if (requestObject.callback) {
          requestObject.callback({ status: 0, error: 'Recording is not active' });
        }
        return;
      }

      // FIFO queue: if queue is full, remove oldest request and add newest
      if (this._pendingRequests.length >= this._options.maxQueueSize) {
        var droppedRequest = this._pendingRequests.shift(); // Remove oldest
        console.log('queue size limit reached (' + this._options.maxQueueSize + '), dropping oldest request');
        if (droppedRequest && droppedRequest.callback) {
          droppedRequest.callback({ status: 0, error: 'Dropped from queue - queue size limit reached' });
        }
      }

      console.log('publishing consent not granted, queuing request');
      this._pendingRequests.push(requestObject);

      // Persist queue to storage
      this._savePersistedQueue();
    },
    _executeOrQueueRequest: function(url, data, options, callback) {
      // Check consent before sending
      if (!this._publishingConsentGranted) {
        this._enqueueRequest({
          type: 'direct',
          url: url,
          data: data,
          options: options,
          callback: callback
        });
        return;
      }

      this._executeRequest(url, data, options, callback);
    },
    initBatching: function () {
      var applicationId = this._options.applicationId;
      var host = this._options.host;

      console.log('does requestBatch.events exists? ' + this.requestBatchers.events);

      if (!this.requestBatchers.events) {
        var batchConfig = {
          libConfig: this._options,
          sendRequestFunc: _.bind(function (endPoint, data, options, cb) {
            this._executeRequest(
              endPoint,
              data,
              options,
              cb
            );
          }, this),
          stopAllBatching: _.bind(function () {
            this.stopAllBatching();
          }, this)
        };

        var hash = quick_hash(applicationId);

        var eventsBatcher = new RequestBatcher('__mf_' + hash + '_ev', HTTP_PROTOCOL + host + MOESIF_CONSTANTS.EVENT_BATCH_ENDPOINT, batchConfig);
        var actionsBatcher = new RequestBatcher('__mf_' + hash + '_ac', HTTP_PROTOCOL + host + MOESIF_CONSTANTS.ACTION_BATCH_ENDPOINT, batchConfig);

        this.requestBatchers = {
          events: eventsBatcher,
          actions: actionsBatcher
        };
      }

      _.each(this.requestBatchers, function (batcher) {
        batcher.start();
      });
    },
    stopAllBatching: function () {
      this._options.batchEnabled = false;
      _.each(this.requestBatchers, function(batcher) {
          batcher.stop();
          batcher.clear();
      });
    },
    _sendOrBatch: function(data, applicationId, endPoint, batcher, callback) {
      var requestInitiated = true;
      var self = this;

      // Check consent before sending
      if (!this._publishingConsentGranted) {
        this._enqueueRequest({
          type: 'batch',
          data: data,
          applicationId: applicationId,
          endPoint: endPoint,
          batcher: batcher,
          callback: callback
        });
        return true;
      }

      var sendImmediately = function () {
        var executeOps = {
          applicationId: applicationId
        };
        return self._executeRequest(endPoint, data, executeOps, callback);
      };

      if (this._options.batchEnabled && batcher) {
        console.log('current batcher storage key is  ' + batcher.queue.storageKey);
        var enqueueCallback = _.bind(function (enqueueSuccess) {
          if (!enqueueSuccess) {
            console.log('enqueue failed, send immediately');
            sendImmediately();
          }
        }, this);
        batcher.enqueue(data, enqueueCallback);
      } else {
        return sendImmediately();
      }
      return requestInitiated;
    },
    'start': function (passedInWeb3) {
      var _self = this;

      if (this._stopRecording || this._stopWeb3Recording) {
        console.log('recording has already started, please call stop first.');
        return false;
      }

      function recorder(event) {
        _self.recordEvent(event);
      }

      console.log('moesif starting');
      this._recordingActive = true; // Mark recording as active
      this._stopRecording = patchAjaxWithCapture(recorder, this._options);

      if (!this._options.disableFetch) {
        console.log('also instrumenting fetch API');
        this._stopFetchRecording = patchFetchWithCapture(recorder);
      }

      if (this._options.enableCrossDomainTracking) {
        console.log('enabling cross domain tracking');

        var targets = this._options.crossDomainTargets;

        // If user has not consented to publishing data, we should not decorate links for cross domain tracking
        var crossDomainDecoratorMiddleware = _.bind(function(context, next) {
          if (this._publishingConsentGranted) {
            next();
          } else {
            // if no consent, skip decoration (ex: not call next())
          }
        }, this);

        // null means decorate all domains (explicit opt-in)
        if (targets === null) {
          console.log('cross domain tracking is enabled for ALL domains and hyperlinks');
          this._stopCrossDomainTracking = decorateLinksForCrossDomainTracking(
            null,
            this._options.crossDomainTrackingParameterName,
            this._anonymousId,
            crossDomainDecoratorMiddleware
          );
        } else if (Array.isArray(targets) && targets.length > 0) {
          console.log('decorating links for cross domain tracking on specified domains: ' + targets.join(', '));
          this._stopCrossDomainTracking = decorateLinksForCrossDomainTracking(
            targets,
            this._options.crossDomainTrackingParameterName,
            this._anonymousId,
            crossDomainDecoratorMiddleware
          );
        } else {
          console.log('cross domain tracking is enabled but no target domains specified - no links will be decorated');
          // Don't set up event listeners if no targets specified
        }
      }

      this['useWeb3'](passedInWeb3);

      // if (passedInWeb3) {
      //   this._stopWeb3Recording = patchWeb3WithCapture(passedInWeb3, _self.recordEvent, this._options);
      // } else if (window['web3']) {
      //   // try to patch the global web3
      //   console.log('found global web3, will capture from it');
      //   this._stopWeb3Recording = patchWeb3WithCapture(window['web3'], _self.recordEvent, this._options);
      // }
      return true;
    },
    // Let users decorate their own links with cdt. (ex: for window.open/location, navigation api, etc.)
    'cdtUrlDecorator': function (url, overrideDomains) {
      if (overrideDomains === undefined) {
          overrideDomains = false;
      }
      if (!url) {
        return url;
      }

      // Check consent before decorating
      if (!this._publishingConsentGranted) {
        console.log('publishing consent not granted, skipping URL decoration');
        return url;
      }

      var decoratableDomains = overrideDomains ? null : this._options.crossDomainTargets;
      return _.crossDomainTrackingUtils.cdtUrlDecorator(url, decoratableDomains, this._options.crossDomainTrackingParameterName, this._anonymousId, window);
    },
     'useWeb3': function (passedInWeb3) {
      var _self = this;

      function recorder(event) {
        _self.recordEvent(event);
      }

      try {
        if (this._stopWeb3Recording) {
          this._stopWeb3Recording();
          this._stopWeb3Recording = null;
        }
        if (passedInWeb3) {
          this._stopWeb3Recording = patchWeb3WithCapture(passedInWeb3, recorder, this._options);
        } else if (window['web3']) {
          // try to patch the global web3
          console.log('found global web3, will capture from it');
          this._stopWeb3Recording = patchWeb3WithCapture(window['web3'], recorder, this._options);
        }
        if (this._stopWeb3Recording) {
          // if function is returned it means we succeeded.
          return true;
        }
      } catch (err) {
        console.log('error patching web3, moving forward anyways');
        if(this._options.callback) {
          this._options.callback({ status: 0, error: err, message: 'failed to instrument web3, but moving forward with other instrumentation' });
        }
      }
      return false;
    },
    updateUser: function(userObject, applicationId, host, callback) {
      this._executeOrQueueRequest(
        HTTP_PROTOCOL + host + MOESIF_CONSTANTS.USER_ENDPOINT,
        userObject,
        { applicationId: applicationId },
        callback
      );
    },
    'identifyUser': function (userId, metadata) {
      if (_.isNil(userId)) {
        console.critical('identifyUser called with nil userId');
        return;
      }

      this._userId = userId;
      if (!(this._options && this._options.applicationId)) {
        throw new Error('Init needs to be called with a valid application Id before calling identify User.');
      }
      var userObject = {
        'user_id': userId
      };

      if (metadata) {
        userObject['metadata'] = metadata;
      }
      if (this._session) {
        userObject['session_token'] = this._session;
      }

      var campaignData = popStoredCampaignDataForUser(this._persist, this._options) || this._currentCampaign;

      if (campaignData) {
        userObject['campaign'] = campaignData;
      }

      if (this._companyId) {
        userObject['company_id'] = this._companyId;
      }

      userObject['anonymous_id'] = this._anonymousId;

      this.updateUser(userObject, this._options.applicationId, this._options.host, this._options.callback);
      try {
        if (userId) {
          this._persist(STORAGE_CONSTANTS.STORED_USER_ID, userId);
        }
      } catch (err) {
        console.error('error saving to local storage');
      }
    },
    updateCompany: function(companyObject, applicationId, host, callback) {
      this._executeOrQueueRequest(
        HTTP_PROTOCOL + host + MOESIF_CONSTANTS.COMPANY_ENDPOINT,
        companyObject,
        { applicationId: applicationId },
        callback
      );
    },
    'identifyCompany': function (companyId, metadata, companyDomain) {
      if (_.isNil(companyId)) {
        console.critical('identifyCompany called with nil companyId.');
        return;
      }

      this._companyId = companyId;
      if (!(this._options && this._options.applicationId)) {
        throw new Error('Init needs to be called with a valid application Id before calling identify User.');
      }
      var companyObject = {
        'company_id': companyId
      };

      if (companyDomain) {
        companyObject['company_domain'] = companyDomain;
      }

      if (metadata) {
        companyObject['metadata'] = metadata;
      }
      if (this._session) {
        companyObject['session_token'] = this._session;
      }

      var campaignData = popStoredCampaignDataForCompany(this._persist, this._options) || this._currentCampaign;

      if (campaignData) {
        companyObject['campaign'] = campaignData;
      }

      this.updateCompany(companyObject, this._options.applicationId, this._options.host, this._options.callback);

      try {
        if (companyId) {
          this._persist(STORAGE_CONSTANTS.STORED_COMPANY_ID, companyId);
        }
      } catch (err) {
        console.error('error saving to local storage');
      }
    },
    'identifySession': function (session) {
      if (_.isNil(session)) {
        console.critical('identifySession called with nil');
        return;
      }
      this._session = session;
      if (session) {
        try {
          this._persist(STORAGE_CONSTANTS.STORED_SESSION_ID, session);
        } catch (err) {
          console.error('local storage error');
        }
      }
    },
    'track': function (actionName, metadata) {
      var _self = this;
      if (!actionName) {
        throw new Error('track name must have action Name defined');
      }

      var actionObject = {
        'action_name': actionName
      };

      if (_self._companyId) {
        actionObject['company_id'] = _self._companyId;
      }
      if (_self._userId) {
        actionObject['user_id'] = _self._userId;
      } else {
        actionObject['anonymous_id'] = _self._anonymousId;
      }
      if (this._session) {
        actionObject['session_token'] = this._session;
      }

      actionObject['request'] = {
        'uri': document.location.href,
        'verb': 'GET', // for UI events on a current page, the current page verb is always get
        'user_agent_string': navigator.userAgent
      };

      actionObject['transaction_id'] = _.uuid4();

      if (metadata) {
        actionObject['metadata'] = metadata;
      }

      // sendAction(actionObject, this._options.applicationId, this._options.debug, this._options.callback);
      var endPoint = HTTP_PROTOCOL + _self._options.host + MOESIF_CONSTANTS.ACTION_ENDPOINT;
      console.log('sending or queuing: ' + actionName);
      return _self._sendOrBatch(
        actionObject,
        _self._options.applicationId,
        endPoint,
        _self.requestBatchers.actions,
        _self._options.callback
      );
    },
    recordEvent: function (event) {
      if (isMoesif(event)) {
        console.log('skipped logging for requests to moesif');
        return;
      }

      var _self = this;
      console.log('determining if should log: ' + event['request']['uri']);
      var logData = Object.assign({}, event);
      if (_self._getUserId()) {
        logData['user_id'] = _self._getUserId();
      } else {
        logData['anonymous_id'] = _self._anonymousId;
      }

      if (_self._getCompanyId()) {
        logData['company_id'] = _self._getCompanyId();
      }
      if (_self._getSession()) {
        logData['session_token'] = _self._getSession();
      }

      logData['tags'] = _self._options.getTags(event) || '';

      if (_self._options.apiVersion) {
        logData['request']['api_version'] = _self._options.apiVersion;
      }

      if (!logData['request']['headers']['User-Agent']) {
        logData['request']['headers']['User-Agent'] = window.navigator.userAgent;
      }

      logData['transaction_id'] = _.uuid4();

      if (_self._options.maskContent) {
        logData = _self._options.maskContent(logData);
      }

      if (_self._options.getMetadata) {
        if (logData['metadata']) {
          var newMetadata = _self._options.getMetadata(logData);
          logData['metadata'] = Object.assign(logData['metadata'], newMetadata);
        } else {
          logData['metadata'] = _self._options.getMetadata(logData);
        }
      }

      if (!_self._options.skip(event) && !isMoesif(event)) {
        // sendEvent(logData, _self._options.applicationId, _self._options.callback);
        console.log('sending or queuing: ' + event['request']['uri']);
        var endPoint = HTTP_PROTOCOL + _self._options.host + MOESIF_CONSTANTS.EVENT_ENDPOINT;
        _self._sendOrBatch(
          logData,
          _self._options.applicationId,
          endPoint,
          _self.requestBatchers.events,
          _self._options.callback
        );
      } else {
        console.log('skipped logging for ' + event['request']['uri']);
      }
    },
    _getUserId: function () {
      return this._userId;
    },
    _getCompanyId: function () {
      return this._companyId;
    },
    _getSession: function () {
      return this._session;
    },
    'stop': function () {
      console.log('stopping moesif recording');
      this._recordingActive = false; // Mark recording as inactive

      if (this._stopRecording) {
        this._stopRecording();
        this._stopRecording = null;
      }
      if (this._stopWeb3Recording) {
        this._stopWeb3Recording();
        this._stopWeb3Recording = null;
      }
      if (this._stopFetchRecording) {
        this._stopFetchRecording();
        this._stopFetchRecording = null;
      }
      if (this._stopCrossDomainTracking) {
        this._stopCrossDomainTracking();
        this._stopCrossDomainTracking = null;
      }
    },
    'clearCookies': function () {
      clearCookies(this._options);
    },
    'clearStorage': function () {
      clearLocalStorage(this._options);
      this._clearPersistedQueue();
    },
    'resetAnonymousId': function () {
      this._anonymousId = regenerateAnonymousId(this._persist);
      return this._anonymousId;
    },
    'reset': function () {
      clearCookies(this._options);
      clearLocalStorage(this._options);
      this._anonymousId = regenerateAnonymousId(this._persist);
      this._companyId = null;
      this._userId = null;
      this._session = null;
      this._currentCampaign = null;
      this._pendingRequests = [];
      this._clearPersistedQueue();
      // Consent state is NOT reset - use revokePublishingConsent() to explicitly revoke consent
    },
    '_flushPendingRequests': function() {
      console.log('flushing ' + this._pendingRequests.length + ' pending requests');

      while (this._pendingRequests.length > 0) {
        var request = this._pendingRequests.shift();

        if (request.type === 'batch') {
          // Re-call _sendOrBatch, but now consent is granted so it will send
          this._sendOrBatch(
            request.data,
            request.applicationId,
            request.endPoint,
            request.batcher,
            request.callback
          );
        } else if (request.type === 'direct') {
          // Direct requests (user/company updates) - just execute with stored parameters
          this._executeRequest(
            request.url,
            request.data,
            request.options,
            request.callback
          );
        }
      }

      // Clear persisted queue after flushing
      this._clearPersistedQueue();
    },
    'grantPublishingConsent': function() {
      if (this._publishingConsentGranted) {
        console.log('publishing consent already granted');
        return;
      }

      console.log('granting publishing consent and flushing pending requests');
      this._publishingConsentGranted = true;
      this._flushPendingRequests();
    },
    'revokePublishingConsent': function() {
      if (!this._publishingConsentGranted) {
        console.log('publishing consent already revoked');
        return;
      }

      console.log('revoking publishing consent - future requests will be queued');
      this._publishingConsentGranted = false;
      // Clear pending requests when revoking consent
      this._pendingRequests = [];
      // Clear persisted queue as well
      this._clearPersistedQueue();
    },
    'isPublishingConsentGranted': function() {
      return this._publishingConsentGranted;
    }
  };
}
