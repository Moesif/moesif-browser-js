/**
 * Created by Xingheng
 */

import { _, console, userAgent, localStorageSupported, JSONStringify } from './utils';
import patchAjaxWithCapture from './capture';
import patchWeb3WithCapture from './web3capture';
import patchFetchWithCapture from './capture-fetch';
import getCampaignData from './campaign';
import Config from './config';
import { RequestBatcher } from './request-batcher';
import {
  getPersistenceFunction,
  getFromPersistence,
  clearCookies,
  STORAGE_CONSTANTS,
  clearLocalStorage
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

/*
 * Dynamic... constants? Is that an oxymoron?
 */
// http://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
// https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#withCredentials
var USE_XHR = (window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest());
// IE<10 does not support cross-origin XHR's but script tags
// with defer won't block window.onload; ENQUEUE_REQUESTS
// should only be true for Opera<12

var ENQUEUE_REQUESTS = !USE_XHR && (userAgent.indexOf('MSIE') === -1) && (userAgent.indexOf('Mozilla') === -1);

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

      ops.getTags = options['getTags'] || function () {
        return undefined;
      };
      ops.maskContent = options['maskContent'] || function (eventData) {
        return eventData;
      };

      ops.getMetadata = options['getMetadata'] || function () {
        return undefined;
      };

      ops.skip = options['skip'] || function () {
        return false;
      };

      ops.debug = options['debug'];
      ops.callback = options['callback'];
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

      this.requestBatchers = {};

      this._options = ops;
      this._persist = getPersistenceFunction(ops);
      try {
        this._userId = getFromPersistence(STORAGE_CONSTANTS.STORED_USER_ID, ops);
        this._session = getFromPersistence(STORAGE_CONSTANTS.STORED_SESSION_ID, ops);
        this._companyId = getFromPersistence(STORAGE_CONSTANTS.STORED_COMPANY_ID, ops);
        this._anonymousId = getAnonymousId(this._persist, ops);
        this._campaign = getCampaignData(this._persist, ops);

        // try to save campaign data on anonymous id
        // if there is no userId saved, means it is still anonymous.
        // later on, when identifyUser is called with real user id,
        // the campaigne data will be resent with that again.
        if (this._campaign && !this._userId) {
          var anonUserObject = {};
          anonUserObject['anonymous_id'] = this._anonymousId;
          anonUserObject['campaign'] = this._campaign;
          this.updateUser(anonUserObject, this._options.applicationId, this._options.host, this._options.callback);
        }
      } catch(err) {
        console.error('error loading saved data from local storage but continue');
      }

      if (ops.batchEnabled) {
        if (!localStorageSupported || !USE_XHR) {
          ops.batchEnabled = false;
          console.log('Turning off batch processing because it needs XHR and localStorage');
        } else {
          this.initBatching();
          if (sendBeacon && window.addEventListener) {
            window.addEventListener('unload', _.bind(function () {
              // Before page closes, attempt to flush any events queued up via navigator.sendBeacon.
              // Since sendBeacon doesn't report success/failure, events will not be removed from
              // the persistent store; if the site is loaded again, the events will be flushed again
              // on startup and deduplicated on the Mixpanel server side.
              this.requestBatchers.events.flush({ sendBeacon: true });
            }, this));
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
          }, this)
        };

        var eventsBatcher = new RequestBatcher('__mf_' + applicationId + '_ev', HTTP_PROTOCOL + host + MOESIF_CONSTANTS.EVENT_BATCH_ENDPOINT, batchConfig);
        var actionsBatcher = new RequestBatcher('__mf_' + applicationId + '_ac', HTTP_PROTOCOL + host + MOESIF_CONSTANTS.ACTION_BATCH_ENDPOINT, batchConfig);

        this.requestBatchers = {
          events: eventsBatcher,
          actions: actionsBatcher
        };
      }

      _.each(this.requestBatchers, function (batcher) {
        batcher.start();
      });
    },
    _sendOrBatch: function(data, applicationId, endPoint, batcher, callback) {
      var requestInitiated = true;

      if (this._options.batchEnabled && batcher) {
        console.log('current batcher storage key is  ' + batcher.queue.storageKey);

        batcher.enqueue(data);
      } else {
        // execute immediately
        var executeOps = {
          applicationId: applicationId
        };

        requestInitiated = this._executeRequest(endPoint, data, executeOps, callback);
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
      this._stopRecording = patchAjaxWithCapture(recorder, this._options);

      if (!this._options.disableFetch) {
        console.log('also instrumenting fetch API');
        this._stopFetchRecording = patchFetchWithCapture(recorder);
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
      this._executeRequest(
        HTTP_PROTOCOL + host + MOESIF_CONSTANTS.USER_ENDPOINT,
        userObject,
        { applicationId: applicationId },
        callback
      );
    },
    'identifyUser': function (userId, metadata) {
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
      if (this._campaign) {
        userObject['campaign'] = this._campaign;
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
      this._executeRequest(
        HTTP_PROTOCOL + host + MOESIF_CONSTANTS.COMPANY_ENDPOINT,
        companyObject,
        { applicationId: applicationId },
        callback
      );
    },
    'identifyCompany': function (companyId, metadata, companyDomain) {
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
      if (this._campaign) {
        companyObject['campaign'] = this._campaign;
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
    },
    'clearCookies': function () {
      clearCookies(this._options);
    },
    'clearStorage': function () {
      clearLocalStorage(this._options);
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
      this._campaign = null;
    }
  };
}
