(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _srcLoaderModule = require('../../src/loader-module');

var _srcLoaderModule2 = _interopRequireDefault(_srcLoaderModule);

_srcLoaderModule2['default'].init({
  applicationId: 'Your Application ID'
});

_srcLoaderModule2['default'].start();

},{"../../src/loader-module":7}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _utils = require('./utils');

var _persistence = require('./persistence');

function regenerateAnonymousId(persist) {
  var newId = _utils._.UUID();
  if (persist) {
    persist(_persistence.STORAGE_CONSTANTS.STORED_ANONYMOUS_ID, newId);
  }
  return newId;
}

function getAnonymousId(persist, opt) {
  var storedAnonId = (0, _persistence.getFromPersistence)(_persistence.STORAGE_CONSTANTS.STORED_ANONYMOUS_ID, opt);
  if (storedAnonId) {
    return storedAnonId;
  }

  return regenerateAnonymousId(persist);
}

exports.getAnonymousId = getAnonymousId;
exports.regenerateAnonymousId = regenerateAnonymousId;

},{"./persistence":11,"./utils":16}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('./utils');

// eslint-disable-line

var _referrer = require('./referrer');

var _referrer2 = _interopRequireDefault(_referrer);

var _utm = require('./utm');

var _persistence = require('./persistence');

var logger = (0, _utils.console_with_prefix)('campaign');

function getGclid(urlParams) {
  var gclid = _utils._.getQueryParamByName('gclid', urlParams);
  if (_utils._.isEmptyString(gclid)) {
    return;
  }
  return gclid;
}

function getCampaignDataFromUrlOrCookie(opt) {
  try {
    var result = {};

    if (!opt.disableUtm) {
      result = (0, _utm.getUtm)() || {};
    }

    if (!opt.disableReferer) {
      var referrer = (0, _referrer2['default'])();
      if (referrer) {
        result['referrer'] = referrer['referrer'];
        result['referring_domain'] = referrer['referring_domain'];
      }
    }
    if (!opt.disableRGclid) {
      var gclid = getGclid(_utils._.getUrlParams());
      if (gclid) {
        result['gclid'] = gclid;
      }
    }

    return result;
  } catch (err) {
    logger.log(err);
  }
}

// since identify company can happen a lot later
// than initial anonymous users
// persist the very initial campaign data for
// companies until company is identified.
function getStoredInitialCampaignData(opt) {
  var storedCampaignData = null;
  var storedCampaignString = null;
  try {
    storedCampaignString = (0, _persistence.getFromPersistence)(_persistence.STORAGE_CONSTANTS.STORED_INITIAL_CAMPAIGN_DATA, opt);
    if (storedCampaignString) {
      storedCampaignData = _utils._.JSONDecode(storedCampaignString);
    }
  } catch (err) {
    logger.error('failed to decode company campaign data ' + storedCampaignString);
    logger.error(err);
  }

  return storedCampaignData;
}

function mergeCampaignData(saved, current) {
  if (!current) {
    return saved;
  }

  if (!saved) {
    return current;
  }

  var result = _utils._.extend({}, saved, current);

  // if utm source exists.
  // every field of UTM will be override to be
  // consistent.
  if (current && current[_utm.UTMConstants.UTM_SOURCE]) {
    for (var prop in _utm.UTMConstants) {
      result[_utm.UTMConstants[prop]] = current[_utm.UTMConstants[prop]];
    }
  }

  return result;
}

function getCampaignData(persist, opt) {
  var storedCampaignData = null;
  var storedCampaignString = null;
  try {
    storedCampaignString = (0, _persistence.getFromPersistence)(_persistence.STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA, opt);
    if (storedCampaignString && storedCampaignString !== 'null') {
      storedCampaignData = _utils._.JSONDecode(storedCampaignString);
    }
  } catch (err) {
    logger.error('failed to decode campaign data ' + storedCampaignString);
    logger.error(err);
  }

  var currentCampaignData = getCampaignDataFromUrlOrCookie(opt);
  logger.log('current campaignData');
  logger.log(_utils._.JSONEncode(currentCampaignData));

  var merged = mergeCampaignData(storedCampaignData, currentCampaignData);
  logger.log('merged campaignData');
  logger.log(_utils._.JSONEncode(merged));

  try {
    if (persist && merged && !_utils._.isEmptyObject(merged)) {
      var mergedString = _utils._.JSONEncode(merged);
      persist(_persistence.STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA, mergedString);

      // UTM_SOURCE exists means that merged campaign info have data.
      if (!storedCampaignData && merged[_utm.UTMConstants.UTM_SOURCE]) {
        // first time we persist campaign data, and thus persis the initial data until identifyCompany is called
        persist(_persistence.STORAGE_CONSTANTS.STORED_INITIAL_CAMPAIGN_DATA, mergedString);
      }
    }
  } catch (err) {
    logger.error('failed to persist campaign data');
    logger.error(err);
  }

  return merged;
}

exports.getCampaignData = getCampaignData;
exports.getStoredInitialCampaignData = getStoredInitialCampaignData;

},{"./persistence":11,"./referrer":12,"./utils":16,"./utm":17}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _utils = require('./utils');

// eslint-disable-line camelcase

var _parsers = require('./parsers');

var logger = (0, _utils.console_with_prefix)('capture fetch');

/**
 *
 * @param {*} headers
 * headers must be a Headers object.
 */
function parseHeaders(headers) {
  var result = {};
  logger.log('parseheaders is called');

  var entries = headers.entries();

  var entry = entries.next();
  while (!entry.done) {
    logger.log(entry.value); // 1 3 5 7 9
    result[entry.value[0]] = entry.value[1];

    entry = entries.next();
  }

  return result;
}

function processSavedRequestResponse(savedRequest, savedResponse, startTime, endTime, recorder) {
  try {
    setTimeout(function () {
      logger.log('interception is here.');
      logger.log(savedRequest);
      logger.log(savedResponse);
      if (savedRequest && savedResponse) {
        // try to exract out information:
        // var reqHeaders = {};
        // var resHeaders = {};

        // for (var pair of savedRequest.headers.entries()) {
        //   reqHeaders[pair[0]] = pair[1];
        // }

        // for (var pair2 of savedResponse.headers.entries()) {
        //   resHeaders[pair2[0]] = pair2[1];
        // }
        try {
          Promise.all([savedRequest.arrayBuffer(), savedResponse.arrayBuffer()]).then(function (bodies) {
            // attemptParseBuffer will return either {}, { body }, or { body, transfer_enconding }
            var processedBodies = bodies.map(_parsers.attemptParseBuffer);

            var requestModel = Object.assign(processedBodies[0], {
              'uri': savedRequest.url,
              'verb': savedRequest.method,
              'time': startTime,
              'headers': parseHeaders(savedRequest.headers)
            });

            var responseModel = Object.assign(processedBodies[1], {
              'status': savedResponse.status,
              'time': endTime,
              'headers': parseHeaders(savedResponse.headers)
            });

            logger.log(requestModel);
            logger.log(responseModel);

            var event = {
              'request': requestModel,
              'response': responseModel
            };

            recorder(event);
          });
        } catch (err) {
          logger.error('error processing body');
        }
      } else {
        logger.log('savedRequest');
      }
    }, 50);
  } catch (err) {
    logger.error('error processing saved fetch request and response, but move on anyways.');
    logger.log(err);
  }
}

function interceptor(recorder, fetch, arg1, arg2) {
  var savedRequest = null;

  try {
    savedRequest = new Request(arg1, arg2);
  } catch (err) {
    // for internal errors only.
  }
  var startTime = new Date().toISOString();
  var endTime = null;

  var promise = null;

  promise = fetch(arg1, arg2);

  var savedResponse = null;
  // add handlers for response.
  promise = promise.then(function (response) {
    //
    savedResponse = response.clone();
    endTime = new Date().toISOString();

    processSavedRequestResponse(savedRequest, savedResponse, startTime, endTime, recorder);

    return response;
  });

  return promise;
}

// var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';

function patch(recorder, env) {
  var myenv = env || window || self;

  if (myenv['fetch']) {
    logger.log('found fetch method.');
    if (!myenv['fetch']['polyfill']) {
      // basically, if it is polyfill, it means
      // that it is using XMLhttpRequest underneath,
      // then no need to patch fetch.
      var oldFetch = myenv['fetch'];

      logger.log('fetch is not polyfilled so instrumenting it');

      myenv['fetch'] = (function (fetch) {
        return function (arg1, arg2) {
          return interceptor(recorder, fetch, arg1, arg2);
        };
      })(myenv['fetch']);

      var unpatch = function unpatch() {
        myenv['fetch'] = oldFetch;
      };

      return unpatch;
    } else {
      // should not patch if it is polyfilled.
      // since it would duplicate the data.
      logger.log('skip patching fetch since it is polyfilled');
      return null;
    }
  } else {
    logger.log('there is no fetch found, so skipping instrumentation.');
  }
}

exports['default'] = patch;
module.exports = exports['default'];

},{"./parsers":10,"./utils":16}],5:[function(require,module,exports){
/**
 * Created by Xingheng on 1/31/17.
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _utils = require('./utils');

// eslint-disable-line camelcase

var _parsers = require('./parsers');

var logger = (0, _utils.console_with_prefix)('capture');

var HTTP_PROTOCOL = 'http:' === (document && document.location.protocol) ? 'http://' : 'https://';

function handleRequestFinished(xhrInstance, postData, recorder) {
  logger.log('processResponse for' + xhrInstance._url);
  var endTime = new Date().toISOString();

  if (recorder) {
    // avoid apiRequest.io and moesif.com
    var myUrl = xhrInstance._url ? xhrInstance._url.toLowerCase() : xhrInstance._url;
    if (myUrl && myUrl.indexOf('moesif.com') < 0 && myUrl.indexOf('apirequest.io') < 0) {

      var requestModel = {
        'uri': convertToFullUrl(xhrInstance._url),
        'verb': xhrInstance._method,
        'time': xhrInstance._startTime,
        'headers': xhrInstance._requestHeaders
      };

      if (postData) {
        if (typeof postData === 'string') {
          logger.log('request post data is string');
          logger.log(postData);

          var parseResult = (0, _parsers.attemptParseText)(postData);
          requestModel['transfer_encoding'] = parseResult['transfer_encoding'];
          requestModel['body'] = parseResult['body'];
        } else if (typeof postData === 'object' || Array.isArray(postData) || typeof postData === 'number' || typeof postData === 'boolean') {
          requestModel['body'] = postData;
        }
      }
      var rawResponseHeaders = xhrInstance.getAllResponseHeaders();

      logger.log('rawResponseHeaders are ' + rawResponseHeaders);

      var responseHeaders = parseResponseHeaders(rawResponseHeaders);

      var _status = xhrInstance.status;
      // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
      if (_status === 1223) {
        _status = 204;
      }

      var responseModel = {
        'status': _status,
        'time': endTime,
        'headers': responseHeaders
      };

      logger.log('responseType: ' + xhrInstance.responseType);
      logger.log('responseText: ' + xhrInstance.responseText);
      logger.log('response: ' + xhrInstance.response);

      // responseText is accessible only if responseType is '' or 'text' and on older browsers
      // but we attempt to grab it anyways.
      var rawText = xhrInstance.responseText;

      var parsedBody = {};

      if (rawText) {
        // responseText is string or null
        parsedBody = (0, _parsers.attemptParseText)(rawText);
        responseModel['body'] = parsedBody['body'];
        responseModel['transfer_encoding'] = parsedBody['transfer_encoding'];
      } else if (xhrInstance.response) {
        // if there is no responseText, but response exists, we'll try process it.
        logger.log('no responseText trying with xhr.response');
        if (_utils._.isString(xhrInstance.response)) {
          logger.log('response is string. attempt to parse');
          parsedBody = (0, _parsers.attemptParseText)(xhrInstance.response);
          responseModel['body'] = parsedBody['body'];
          responseModel['transfer_encoding'] = parsedBody['transfer_encoding'];
        } else if (_utils._.isArrayBuffer(xhrInstance.response)) {
          logger.log('response is arraybuffer. attempt to parse');
          parsedBody = (0, _parsers.attemptParseBuffer)(xhrInstance.response);
          responseModel['body'] = parsedBody['body'];
          responseModel['transfer_encoding'] = parsedBody['transfer_encoding'];
        } else if (_utils._.isArray(xhrInstance.response) || _utils._.isObject(xhrInstance.response)) {
          responseModel['body'] = xhrInstance.response;
        }
      }

      var event = {
        'request': requestModel,
        'response': responseModel
      };

      recorder(event);
    }
  }
}

function isJsonHeader(headers) {
  if (headers) {
    if (headers['content-type'] && headers['content-type'].indexOf('json') >= 0) {
      return true;
    }
    if (headers['Content-Type'] && headers['Content-Type'].indexOf('json') >= 0) {
      return true;
    }
  }
  return false;
}

function isStartJson(body) {
  if (body && typeof body === 'string') {
    var trimmedBody = _utils._.trim(body);
    if (trimmedBody.indexOf('[') === 0 || trimmedBody.indexOf('{') === 0) {
      return true;
    }
  }
  return false;
}

function parseResponseHeaders(headerStr) {
  var headers = {};
  if (!headerStr) {
    return headers;
  }
  var headerPairs = headerStr.split('\r\n');
  for (var i = 0; i < headerPairs.length; i++) {
    var headerPair = headerPairs[i];
    var index = headerPair.indexOf(': ');
    if (index > 0) {
      var key = headerPair.substring(0, index);
      headers[key] = headerPair.substring(index + 2);
    }
  }
  return headers;
}

function convertToFullUrl(url) {
  if (url && typeof url === 'string') {
    var trimedUrl = _utils._.trim(url);
    if (trimedUrl.indexOf('http') !== 0) {
      return HTTP_PROTOCOL + window.location.host + '/' + trimedUrl.replace(/^\./, '').replace(/^\//, '');
    } else {
      return url;
    }
  }
  return url;
}

/**
 * @param recorder
 * @returns {undoPatch}
 *
 * The recorder is a function that takes an Event and records it.
 *
 */
function captureXMLHttpRequest(recorder, options) {
  var XHR = XMLHttpRequest.prototype;

  var shouldPatchOnReadyState = options && options.eagerBodyLogging;

  var open = XHR.open;
  var send = XHR.send;
  var setRequestHeader = XHR.setRequestHeader;

  // Collect data:
  XHR.open = function (method, url) {
    logger.log('XHR open triggered');
    this._method = method;
    this._url = url;
    this._requestHeaders = {};
    this._startTime = new Date().toISOString();
    return open.apply(this, arguments);
  };

  XHR.setRequestHeader = function (header, value) {
    this._requestHeaders[header] = value;
    return setRequestHeader.apply(this, arguments);
  };

  XHR.send = function (postData) {
    logger.log('XHR send started for ' + this._url);

    var _self = this;

    // in case of eagerBodyLogging, we'll
    // patch onreadystatechange which is more of
    // replacement or if addEventListener does not exist.
    if (shouldPatchOnReadyState || !this.addEventListener) {
      var _onreadystatechange = this.onreadystatechange;
      this.onreadystatechange = function () {
        var readyState = _self.readyState;
        logger.log('readyState ' + readyState);
        if (readyState === XMLHttpRequest.DONE) {
          logger.log('XHR onreadystatechange DONE triggered for ' + _self._url);
          handleRequestFinished(_self, postData, recorder);
        }

        if (_onreadystatechange && _utils._.isFunction(_onreadystatechange)) {
          logger.log('trigger old onreadystatechange');
          return _onreadystatechange.apply(this, arguments);
        }
      };
    } else {
      // this only adds another listener.
      this.addEventListener('loadend', function () {
        logger.log('XHR loadend triggered for ' + _self._url);
        handleRequestFinished(_self, postData, recorder);
      });
    }

    return send.apply(this, arguments);
  };

  var undoPatch = function undoPatch() {
    XHR.open = open;
    XHR.send = send;
    XHR.setRequestHeader = setRequestHeader;
  };

  // so caller have a handle to undo the patch if needed.
  return undoPatch;
}

exports['default'] = captureXMLHttpRequest;
module.exports = exports['default'];

},{"./parsers":10,"./utils":16}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
var Config = {
    DEBUG: false,
    LIB_VERSION: '1.8.12'
};

exports['default'] = Config;
module.exports = exports['default'];

},{}],7:[function(require,module,exports){
/* eslint camelcase: "off" */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _moesifCore = require('./moesif-core');

var moesif = (0, _moesifCore.init_as_module)();

exports['default'] = moesif;
module.exports = exports['default'];

},{"./moesif-core":8}],8:[function(require,module,exports){
/* eslint camelcase: "off" */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.init_from_snippet = init_from_snippet;
exports.init_as_module = init_as_module;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _moesif = require('./moesif');

var _moesif2 = _interopRequireDefault(_moesif);

/*
 * Moesif Browser JS Library
 *
 * Copyright 2017, Moesif Inc. All Rights Reserved
 */

// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @output_file_name moesif-1.0.min.js
// ==/ClosureCompiler==

/*
SIMPLE STYLE GUIDE:

this.x === public function
this._x === internal - only use within this file
this.__x === private - only use within the class

Globals should be all caps
*/

var init_type; // MODULE or SNIPPET loader
var INIT_MODULE = 0;
var INIT_SNIPPET = 1;

/*
 * Constants
 */
/** @const */var PRIMARY_INSTANCE_NAME = 'moesif';

// var DOM_LOADED = false;

function init_from_snippet() {
  init_type = INIT_SNIPPET;
  window[PRIMARY_INSTANCE_NAME] = (0, _moesif2['default'])();
  window[PRIMARY_INSTANCE_NAME]['new'] = _moesif2['default'];
}

function init_as_module() {
  init_type = INIT_MODULE;
  var instance = (0, _moesif2['default'])();
  instance['new'] = _moesif2['default'];
  return instance;
}

},{"./moesif":9}],9:[function(require,module,exports){
/**
 * Created by Xingheng
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('./utils');

var _capture = require('./capture');

var _capture2 = _interopRequireDefault(_capture);

var _web3capture = require('./web3capture');

var _web3capture2 = _interopRequireDefault(_web3capture);

var _captureFetch = require('./capture-fetch');

var _captureFetch2 = _interopRequireDefault(_captureFetch);

var _campaign = require('./campaign');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _requestBatcher = require('./request-batcher');

var _persistence = require('./persistence');

var _anonymousId = require('./anonymousId');

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
var USE_XHR = window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest();
// IE<10 does not support cross-origin XHR's but script tags
// with defer won't block window.onload; ENQUEUE_REQUESTS
// should only be true for Opera<12

var ENQUEUE_REQUESTS = !USE_XHR && _utils.userAgent.indexOf('MSIE') === -1 && _utils.userAgent.indexOf('Mozilla') === -1;

var NOOP = function NOOP() {};

// save reference to navigator.sendBeacon so it can be minified
var sendBeacon = null;
if (navigator['sendBeacon']) {
  sendBeacon = function () {
    // late reference to navigator.sendBeacon to allow patching/spying
    return navigator['sendBeacon'].apply(navigator, arguments);
  };
}

var HTTP_PROTOCOL = 'http:' === (document && document.location.protocol) ? 'http://' : 'https://';

function isContentJson(event) {
  try {
    var contentType = event['request']['headers']['Content-Type'] || event['request']['headers']['content-type'] || event['response']['headers']['Content-Type'] || event['response']['headers']['content-type'];

    return contentType && contentType.toLowerCase().indexOf('json') > 0;
  } catch (err) {
    return false;
  }
}

function isMoesif(event) {
  try {
    return event['request']['headers']['X-Moesif-SDK'];
  } catch (err) {
    return false;
  }
}

function ensureValidOptions(options) {
  if (!options) throw new Error('options are required by moesif-browser-js middleware');
  if (!options['applicationId']) throw new Error('A moesif application id is required. Please obtain it through your settings at www.moesif.com');

  if (options['getTags'] && !_utils._.isFunction(options['getTags'])) {
    throw new Error('getTags should be a function');
  }
  if (options['getMetadata'] && !_utils._.isFunction(options['getMetadata'])) {
    throw new Error('getMetadata should be a function');
  }
  if (options['getApiVersion'] && !_utils._.isFunction(options['getApiVersion'])) {
    throw new Error('identifyUser should be a function');
  }
  if (options['maskContent'] && !_utils._.isFunction(options['maskContent'])) {
    throw new Error('maskContent should be a function');
  }
  if (options['skip'] && !_utils._.isFunction(options['skip'])) {
    throw new Error('skip should be a function');
  }
}

exports['default'] = function () {
  _utils.console.log('moesif object creator is called');

  return {
    'init': function init(options) {
      if (!window) {
        _utils.console.critical('Warning, this library need to be initiated on the client side');
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

      ops['batch_size'] = options['batchSize'] || 25, ops['batch_flush_interval_ms'] = options['batchMaxTime'] || 2500;
      ops['batch_request_timeout_ms'] = options['batchTimeout'] || 90000;
      ops['batch_storage_expiration'] = options['batchStorageExpiration'];

      // storage persistence based options.
      // cookie, localStorage, or none.
      ops['persistence'] = options['persistence'] || 'localStorage';

      // below persistence options only applies to cookie.
      ops['cross_site_cookie'] = options['crossSiteCookie'] || false;
      // the default value for this is true.
      ops['cross_subdomain_cookie'] = options['crossSubdomainCookie'] === false ? false : true;
      ops['cookie_expiration'] = options['cookieExpiration'] || 365;
      ops['secure_cookie'] = options['secureCookie'] || false;
      ops['cookie_domain'] = options['cookieDomain'] || '';
      ops['persistence_key_prefix'] = options['persistenceKeyPrefix'];

      this.requestBatchers = {};

      this._options = ops;
      this._persist = (0, _persistence.getPersistenceFunction)(ops);
      try {
        this._userId = (0, _persistence.getFromPersistence)(_persistence.STORAGE_CONSTANTS.STORED_USER_ID, ops);
        this._session = (0, _persistence.getFromPersistence)(_persistence.STORAGE_CONSTANTS.STORED_SESSION_ID, ops);
        this._companyId = (0, _persistence.getFromPersistence)(_persistence.STORAGE_CONSTANTS.STORED_COMPANY_ID, ops);
        this._anonymousId = (0, _anonymousId.getAnonymousId)(this._persist, ops);
        this._campaign = (0, _campaign.getCampaignData)(this._persist, ops);

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
      } catch (err) {
        _utils.console.error('error loading saved data from local storage but continue');
      }

      if (ops.batchEnabled) {
        if (!(0, _utils.localStorageSupported)() || !USE_XHR) {
          ops.batchEnabled = false;
          _utils.console.log('Turning off batch processing because it needs XHR and localStorage');
        } else {
          this.initBatching();
          if (sendBeacon && window.addEventListener) {
            var flushOnClose = _utils._.bind(function () {
              _utils._.each(this.requestBatchers, function (batcher) {
                if (!batcher.stopped) {
                  batcher.flush({ sendBeacon: true });
                }
              });
            }, this);

            // some browsers do not support visibilitychange event.
            window.addEventListener('pagehide', function (ev) {
              flushOnClose();
            });

            window.addEventListener('visibilitychange', function () {
              if (document['visibilityState'] === 'hidden') {
                flushOnClose();
              }
            });
          }
        }
      }

      _utils.console.log('moesif initiated');
      return this;
    },
    _executeRequest: function _executeRequest(url, data, options, callback) {
      // options structure
      // {
      //   method: 'POST',
      //   verbose: true,
      //   ignore_json_errors: true, // eslint-disable-line camelcase
      //   timeout_ms: timeoutMS, // eslint-disable-line camelcase
      //   applicationId
      // };
      var token = options && options.applicationId || this._options.applicationId;
      var method = options && options.method || 'POST';

      // right now we onlu support USE_XHR
      try {
        var xmlhttp = new XMLHttpRequest(); // new HttpRequest instance
        xmlhttp.open(method, url);
        xmlhttp.setRequestHeader('Content-Type', 'application/json');
        xmlhttp.setRequestHeader('X-Moesif-Application-Id', token);
        xmlhttp.setRequestHeader('X-Moesif-SDK', 'moesif-browser-js/' + _config2['default'].LIB_VERSION);

        if (options.timeout_ms && typeof xmlhttp.timeout !== 'undefined') {
          xmlhttp.timeout = options.timeout_ms;
          var startTime = new Date().getTime();
        }
        xmlhttp.onreadystatechange = function () {
          if (xmlhttp.readyState === 4) {
            // XMLHttpRequest.DONE == 4, except in safari 4
            if (xmlhttp.status >= 200 && xmlhttp.status <= 300) {
              if (callback) {
                var response = XMLHttpRequest.responseText;
                callback(response);
              }
            } else {
              var error;
              if (xmlhttp.timeout && !xmlhttp.status && new Date().getTime() - startTime >= xmlhttp.timeout) {
                error = 'timeout';
              } else {
                error = 'Bad HTTP status: ' + xmlhttp.status + ' ' + xmlhttp.statusText;
              }
              _utils.console.error(error);
              if (callback) {
                callback({ status: 0, error: error, xhr_req: xmlhttp }); // eslint-disable-line camelcase
              }
            }
          }
        };

        xmlhttp.send((0, _utils.JSONStringify)(data));
      } catch (err) {
        _utils.console.error('failed to send to moesif ' + (data && data['request'] && data['request']['uri']));
        _utils.console.error(err);
        if (callback) {
          callback({ status: 0, error: err });
        }
      }
    },
    initBatching: function initBatching() {
      var applicationId = this._options.applicationId;
      var host = this._options.host;

      _utils.console.log('does requestBatch.events exists? ' + this.requestBatchers.events);

      if (!this.requestBatchers.events) {
        var batchConfig = {
          libConfig: this._options,
          sendRequestFunc: _utils._.bind(function (endPoint, data, options, cb) {
            this._executeRequest(endPoint, data, options, cb);
          }, this),
          stopAllBatching: _utils._.bind(function () {
            this.stopAllBatching();
          }, this)
        };

        var hash = (0, _utils.quick_hash)(applicationId);

        var eventsBatcher = new _requestBatcher.RequestBatcher('__mf_' + hash + '_ev', HTTP_PROTOCOL + host + MOESIF_CONSTANTS.EVENT_BATCH_ENDPOINT, batchConfig);
        var actionsBatcher = new _requestBatcher.RequestBatcher('__mf_' + hash + '_ac', HTTP_PROTOCOL + host + MOESIF_CONSTANTS.ACTION_BATCH_ENDPOINT, batchConfig);

        this.requestBatchers = {
          events: eventsBatcher,
          actions: actionsBatcher
        };
      }

      _utils._.each(this.requestBatchers, function (batcher) {
        batcher.start();
      });
    },
    stopAllBatching: function stopAllBatching() {
      this._options.batchEnabled = false;
      _utils._.each(this.requestBatchers, function (batcher) {
        batcher.stop();
        batcher.clear();
      });
    },
    _sendOrBatch: function _sendOrBatch(data, applicationId, endPoint, batcher, callback) {
      var requestInitiated = true;
      var self = this;

      var sendImmediately = function sendImmediately() {
        var executeOps = {
          applicationId: applicationId
        };
        return self._executeRequest(endPoint, data, executeOps, callback);
      };

      if (this._options.batchEnabled && batcher) {
        _utils.console.log('current batcher storage key is  ' + batcher.queue.storageKey);
        var enqueueCallback = _utils._.bind(function (enqueueSuccess) {
          if (!enqueueSuccess) {
            _utils.console.log('enqueue failed, send immediately');
            sendImmediately();
          }
        }, this);
        batcher.enqueue(data, enqueueCallback);
      } else {
        return sendImmediately();
      }
      return requestInitiated;
    },
    'start': function start(passedInWeb3) {
      var _self = this;

      if (this._stopRecording || this._stopWeb3Recording) {
        _utils.console.log('recording has already started, please call stop first.');
        return false;
      }

      function recorder(event) {
        _self.recordEvent(event);
      }

      _utils.console.log('moesif starting');
      this._stopRecording = (0, _capture2['default'])(recorder, this._options);

      if (!this._options.disableFetch) {
        _utils.console.log('also instrumenting fetch API');
        this._stopFetchRecording = (0, _captureFetch2['default'])(recorder);
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
    'useWeb3': function useWeb3(passedInWeb3) {
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
          this._stopWeb3Recording = (0, _web3capture2['default'])(passedInWeb3, recorder, this._options);
        } else if (window['web3']) {
          // try to patch the global web3
          _utils.console.log('found global web3, will capture from it');
          this._stopWeb3Recording = (0, _web3capture2['default'])(window['web3'], recorder, this._options);
        }
        if (this._stopWeb3Recording) {
          // if function is returned it means we succeeded.
          return true;
        }
      } catch (err) {
        _utils.console.log('error patching web3, moving forward anyways');
        if (this._options.callback) {
          this._options.callback({ status: 0, error: err, message: 'failed to instrument web3, but moving forward with other instrumentation' });
        }
      }
      return false;
    },
    updateUser: function updateUser(userObject, applicationId, host, callback) {
      this._executeRequest(HTTP_PROTOCOL + host + MOESIF_CONSTANTS.USER_ENDPOINT, userObject, { applicationId: applicationId }, callback);
    },
    'identifyUser': function identifyUser(userId, metadata) {
      if (_utils._.isNil(userId)) {
        _utils.console.critical('identifyUser called with nil userId');
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
          this._persist(_persistence.STORAGE_CONSTANTS.STORED_USER_ID, userId);
        }
      } catch (err) {
        _utils.console.error('error saving to local storage');
      }
    },
    updateCompany: function updateCompany(companyObject, applicationId, host, callback) {
      this._executeRequest(HTTP_PROTOCOL + host + MOESIF_CONSTANTS.COMPANY_ENDPOINT, companyObject, { applicationId: applicationId }, callback);
    },
    'identifyCompany': function identifyCompany(companyId, metadata, companyDomain) {
      if (_utils._.isNil(companyId)) {
        _utils.console.critical('identifyCompany called with nil companyId.');
        return;
      }

      var hasCompanyIdentifiedBefore = !!this._companyId;

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

      var campaignData = hasCompanyIdentifiedBefore ? this._campaign : (0, _campaign.getStoredInitialCampaignData)(this._options) || this._campaign;

      if (campaignData) {
        companyObject['campaign'] = campaignData;
      }

      this.updateCompany(companyObject, this._options.applicationId, this._options.host, this._options.callback);

      try {
        if (companyId) {
          this._persist(_persistence.STORAGE_CONSTANTS.STORED_COMPANY_ID, companyId);
        }
      } catch (err) {
        _utils.console.error('error saving to local storage');
      }
    },
    'identifySession': function identifySession(session) {
      if (_utils._.isNil(session)) {
        _utils.console.critical('identifySession called with nil');
        return;
      }
      this._session = session;
      if (session) {
        try {
          this._persist(_persistence.STORAGE_CONSTANTS.STORED_SESSION_ID, session);
        } catch (err) {
          _utils.console.error('local storage error');
        }
      }
    },
    'track': function track(actionName, metadata) {
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

      actionObject['transaction_id'] = _utils._.uuid4();

      if (metadata) {
        actionObject['metadata'] = metadata;
      }

      // sendAction(actionObject, this._options.applicationId, this._options.debug, this._options.callback);
      var endPoint = HTTP_PROTOCOL + _self._options.host + MOESIF_CONSTANTS.ACTION_ENDPOINT;
      _utils.console.log('sending or queuing: ' + actionName);
      return _self._sendOrBatch(actionObject, _self._options.applicationId, endPoint, _self.requestBatchers.actions, _self._options.callback);
    },
    recordEvent: function recordEvent(event) {
      if (isMoesif(event)) {
        _utils.console.log('skipped logging for requests to moesif');
        return;
      }

      var _self = this;
      _utils.console.log('determining if should log: ' + event['request']['uri']);
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

      logData['transaction_id'] = _utils._.uuid4();

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
        _utils.console.log('sending or queuing: ' + event['request']['uri']);
        var endPoint = HTTP_PROTOCOL + _self._options.host + MOESIF_CONSTANTS.EVENT_ENDPOINT;
        _self._sendOrBatch(logData, _self._options.applicationId, endPoint, _self.requestBatchers.events, _self._options.callback);
      } else {
        _utils.console.log('skipped logging for ' + event['request']['uri']);
      }
    },
    _getUserId: function _getUserId() {
      return this._userId;
    },
    _getCompanyId: function _getCompanyId() {
      return this._companyId;
    },
    _getSession: function _getSession() {
      return this._session;
    },
    'stop': function stop() {
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
    'clearCookies': function clearCookies() {
      (0, _persistence.clearCookies)(this._options);
    },
    'clearStorage': function clearStorage() {
      (0, _persistence.clearLocalStorage)(this._options);
    },
    'resetAnonymousId': function resetAnonymousId() {
      this._anonymousId = (0, _anonymousId.regenerateAnonymousId)(this._persist);
      return this._anonymousId;
    },
    'reset': function reset() {
      (0, _persistence.clearCookies)(this._options);
      (0, _persistence.clearLocalStorage)(this._options);
      this._anonymousId = (0, _anonymousId.regenerateAnonymousId)(this._persist);
      this._companyId = null;
      this._userId = null;
      this._session = null;
      this._campaign = null;
    }
  };
};

module.exports = exports['default'];

},{"./anonymousId":2,"./campaign":3,"./capture":5,"./capture-fetch":4,"./config":6,"./persistence":11,"./request-batcher":13,"./utils":16,"./web3capture":18}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _utils = require('./utils');

// eslint-disable-line camelcase

var logger = (0, _utils.console_with_prefix)('parsers');

var attemptParseText = function attemptParseText(text) {
  try {
    return { 'body': _utils._.JSONDecode(text) };
  } catch (err) {
    logger.log('JSON decode failed');
    logger.log(err);
    return {
      'transfer_encoding': 'base64', // eslint-disable-line camelcase
      'body': _utils._.base64Encode(text)
    };
  }
};

/**
 * @param {*} buffer
 * this checks the buffer and
 * returns something to start building the response or request model
 * with body filled in.
 */
var attemptParseBuffer = function attemptParseBuffer(buffer) {
  if (!buffer) return {};
  logger.log('about to decode buffer');
  logger.log(buffer);
  logger.log(buffer.byteLength);

  if (buffer.byteLength <= 0) {
    // empty body.
    return {};
  }

  try {
    var decoder = new TextDecoder('utf-8');
    var text = decoder.decode(buffer);

    try {
      return { 'body': _utils._.JSONDecode(text) };
    } catch (err) {
      logger.error(err);
      return {
        'transfer_encoding': 'base64',
        'body': _utils._.base64Encode(text)
      };
    }
  } catch (err) {
    logger.error(err);
    logger.log(buffer);
    return {
      'transfer_encoding': 'base64',
      'body': 'can not be decoded'
    };
  }
};

exports.attemptParseBuffer = attemptParseBuffer;
exports.attemptParseText = attemptParseText;

},{"./utils":16}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _utils = require('./utils');

var STORAGE_CONSTANTS = {
  STORED_USER_ID: 'moesif_stored_user_id',
  STORED_COMPANY_ID: 'moesif_stored_company_id',
  STORED_SESSION_ID: 'moesif_stored_session_id',
  STORED_ANONYMOUS_ID: 'moesif_anonymous_id',
  STORED_CAMPAIGN_DATA: 'moesif_campaign_data',
  STORED_INITIAL_CAMPAIGN_DATA: 'moesif_initial_campaign'
};

function replacePrefix(key, prefix) {
  if (!prefix) return key;
  if (key.indexOf('moesif_') === 0) {
    return key.replace('moesif_', prefix);
  }
  return key;
}

function getPersistenceFunction(opt) {
  var storageType = opt['persistence'];
  if (storageType !== 'cookie' && storageType !== 'localStorage') {
    _utils.console.critical('Unknown persistence type ' + storageType + '; falling back to cookie');
    storageType = _config2['default']['persistence'] = 'localStorage';
  }
  var prefix = opt['persistence_key_prefix'];

  // we default to localStorage unless cookie is specificied.
  var setFunction = function setFunction(key, value) {
    var resolvedKey = replacePrefix(key, prefix);
    _utils._.localStorage.set(resolvedKey, value);
    // if localStorage and by default, we'll try to set the cookie too.
    _utils._.cookie.set(resolvedKey, value, opt['cookie_expiration'], opt['cross_subdomain_cookie'], opt['secure_cookie'], opt['cross_site_cookie'], opt['cookie_domain']);
  };

  if (storageType === 'cookie' || !_utils._.localStorage.is_supported()) {
    setFunction = function (key, value) {
      var resolvedKey = replacePrefix(key, prefix);
      _utils._.cookie.set(resolvedKey, value, opt['cookie_expiration'], opt['cross_subdomain_cookie'], opt['secure_cookie'], opt['cross_site_cookie'], opt['cookie_domain']);
    };
  }

  if (storageType === 'none') {
    setFunction = function () {};
  }

  return setFunction;
}

function ensureNotNilString(str) {
  // this is sometimes localStorage saves null and undefined
  // as string null and undefined
  if (str === 'null' || str === 'undefined' || str === '') {
    return null;
  }
  return str;
}

// this tries to get from either cookie or localStorage.
// whichever have data.
function getFromPersistence(key, opt) {
  var storageType = opt && opt['persistence'];
  var prefix = opt && opt['persistence_key_prefix'];
  var resolvedKey = replacePrefix(key, prefix);
  if (_utils._.localStorage.is_supported()) {
    var localValue = ensureNotNilString(_utils._.localStorage.get(resolvedKey));
    var cookieValue = ensureNotNilString(_utils._.cookie.get(resolvedKey));
    // if there is value in cookie but not in localStorage
    // but persistence type if localStorage, try to re-save in localStorage.
    if (!localValue && cookieValue && storageType === 'localStorage') {
      _utils._.localStorage.set(resolvedKey, cookieValue);
    }
    return localValue || cookieValue;
  }
  return ensureNotNilString(_utils._.cookie.get(resolvedKey));
}

function clearCookies(opt) {
  var prefix = opt && opt['persistence_key_prefix'];
  _utils._.cookie.remove(replacePrefix(STORAGE_CONSTANTS.STORED_USER_ID, prefix));
  _utils._.cookie.remove(replacePrefix(STORAGE_CONSTANTS.STORED_COMPANY_ID, prefix));
  _utils._.cookie.remove(replacePrefix(STORAGE_CONSTANTS.STORED_ANONYMOUS_ID, prefix));
  _utils._.cookie.remove(replacePrefix(STORAGE_CONSTANTS.STORED_SESSION_ID, prefix));
  _utils._.cookie.remove(replacePrefix(STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA, prefix));
}

function clearLocalStorage(opt) {
  var prefix = opt && opt['persistence_key_prefix'];
  _utils._.localStorage.remove(replacePrefix(STORAGE_CONSTANTS.STORED_USER_ID, prefix));
  _utils._.localStorage.remove(replacePrefix(STORAGE_CONSTANTS.STORED_COMPANY_ID, prefix));
  _utils._.localStorage.remove(replacePrefix(STORAGE_CONSTANTS.STORED_ANONYMOUS_ID, prefix));
  _utils._.localStorage.remove(replacePrefix(STORAGE_CONSTANTS.STORED_SESSION_ID, prefix));
  _utils._.localStorage.remove(replacePrefix(STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA, prefix));
}

exports.getFromPersistence = getFromPersistence;
exports.getPersistenceFunction = getPersistenceFunction;
exports.STORAGE_CONSTANTS = STORAGE_CONSTANTS;
exports.clearCookies = clearCookies;
exports.clearLocalStorage = clearLocalStorage;

},{"./config":6,"./utils":16}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _utils = require('./utils');

// eslint-disable-line

var logger = (0, _utils.console_with_prefix)('referrer');

function _getReferrerStr() {
  return document && document.referrer;
}

function _getReferringDomain(referrer) {
  if (_utils._.isEmptyString(referrer)) {
    return null;
  }
  var parts = referrer.split('/');
  if (parts.length >= 3) {
    return parts[2];
  }
  return null;
}

function getReferrer() {
  var referrer = _getReferrerStr();

  logger.log(referrer);

  if (_utils._.isEmptyString(referrer)) {
    return;
  }

  if (referrer.indexOf(location.protocol + '//' + location.host) === 0) {
    logger.log('referrer is the same so skipping');
    return;
  }

  var referrerInfo = {
    'referrer': referrer,
    'referring_domain': _getReferringDomain(referrer)
  };

  return referrerInfo;
}

exports['default'] = getReferrer;
module.exports = exports['default'];

},{"./utils":16}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _requestQueue = require('./request-queue');

var _utils = require('./utils');

// eslint-disable-line camelcase

// maximum interval between request retries after exponential backoff
var MAX_RETRY_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
var MAX_REMOVE_FAILURE = 5;

var logger = (0, _utils.console_with_prefix)('batch');

/**
 * RequestBatcher: manages the queueing, flushing, retry etc of requests of one
 * type (events, people, groups).
 * Uses RequestQueue to manage the backing store.
 * @constructor
 */
var RequestBatcher = function RequestBatcher(storageKey, endpoint, options) {
    var storageExpiration = options.libConfig['batch_storage_expiration'];
    this.queue = new _requestQueue.RequestQueue(storageKey, { storage: options.storage, storageExpiration: storageExpiration });
    this.endpoint = endpoint;

    this.libConfig = options.libConfig;
    this.sendRequest = options.sendRequestFunc;

    // seed variable batch size + flush interval with configured values
    this.batchSize = this.libConfig['batch_size'];
    this.flushInterval = this.libConfig['batch_flush_interval_ms'];

    this.stopAllBatching = options.stopAllBatching;

    this.stopped = false;
    this.removalFailures = 0;
};

/**
 * Add one item to queue.
 */
RequestBatcher.prototype.enqueue = function (item, cb) {
    this.queue.enqueue(item, this.flushInterval, cb);
};

/**
 * Start flushing batches at the configured time interval. Must call
 * this method upon SDK init in order to send anything over the network.
 */
RequestBatcher.prototype.start = function () {
    this.stopped = false;
    this.removalFailures = 0;
    this.flush();
};

/**
 * Stop flushing batches. Can be restarted by calling start().
 */
RequestBatcher.prototype.stop = function () {
    this.stopped = true;
    if (this.timeoutID) {
        clearTimeout(this.timeoutID);
        this.timeoutID = null;
    }
};

/**
 * Clear out queue.
 */
RequestBatcher.prototype.clear = function () {
    this.queue.clear();
};

/**
 * Restore batch size configuration to whatever is set in the main SDK.
 */
RequestBatcher.prototype.resetBatchSize = function () {
    this.batchSize = this.libConfig['batch_size'];
};

/**
 * Restore flush interval time configuration to whatever is set in the main SDK.
 */
RequestBatcher.prototype.resetFlush = function () {
    this.scheduleFlush(this.libConfig['batch_flush_interval_ms']);
};

/**
 * Schedule the next flush in the given number of milliseconds.
 */
RequestBatcher.prototype.scheduleFlush = function (flushMS) {
    this.flushInterval = flushMS;
    if (!this.stopped) {
        // don't schedule anymore if batching has been stopped
        this.timeoutID = setTimeout(_utils._.bind(this.flush, this), this.flushInterval);
    }
};

/**
 * Flush one batch to network. Depending on success/failure modes, it will either
 * remove the batch from the queue or leave it in for retry, and schedule the next
 * flush. In cases of most network or API failures, it will back off exponentially
 * when retrying.
 * @param {Object} [options]
 * @param {boolean} [options.sendBeacon] - whether to send batch with
 * navigator.sendBeacon (only useful for sending batches before page unloads, as
 * sendBeacon offers no callbacks or status indications)
 */
RequestBatcher.prototype.flush = function (options) {
    try {
        if (this.requestInProgress) {
            logger.log('Flush: Request already in progress');
            return;
        }

        options = options || {};
        var currentBatchSize = this.batchSize;
        var batch = this.queue.fillBatch(currentBatchSize);
        logger.log('current batch size is ' + batch.length);

        if (batch.length < 1) {
            this.resetFlush();
            return; // nothing to do
        }

        this.requestInProgress = true;

        var timeoutMS = this.libConfig['batch_request_timeout_ms'];
        var startTime = new Date().getTime();
        var dataForRequest = _utils._.map(batch, function (item) {
            return item['payload'];
        });
        var batchSendCallback = _utils._.bind(function (res) {
            this.requestInProgress = false;

            try {
                // handle API response in a try-catch to make sure we can reset the
                // flush operation if something goes wrong

                var removeItemsFromQueue = false;
                if (_utils._.isObject(res) && res.error === 'timeout' && new Date().getTime() - startTime >= timeoutMS) {
                    logger.error('Network timeout; retrying');
                    this.flush();
                } else if (_utils._.isObject(res) && res.xhr_req && (res.xhr_req['status'] >= 500 || res.xhr_req['status'] <= 0)) {
                    // network or API error, retry
                    var retryMS = this.flushInterval * 2;
                    var headers = res.xhr_req['responseHeaders'];
                    if (headers) {
                        var retryAfter = headers['Retry-After'];
                        if (retryAfter) {
                            retryMS = parseInt(retryAfter, 10) * 1000 || retryMS;
                        }
                    }
                    retryMS = Math.min(MAX_RETRY_INTERVAL_MS, retryMS);
                    logger.error('Error; retry in ' + retryMS + ' ms');
                    this.scheduleFlush(retryMS);
                } else if (_utils._.isObject(res) && res.xhr_req && res.xhr_req['status'] === 413) {
                    // 413 Payload Too Large
                    if (batch.length > 1) {
                        var halvedBatchSize = Math.max(1, Math.floor(currentBatchSize / 2));
                        this.batchSize = Math.min(this.batchSize, halvedBatchSize, batch.length - 1);
                        logger.error('413 response; reducing batch size to ' + this.batchSize);
                        this.resetFlush();
                    } else {
                        logger.error('Single-event request too large; dropping', batch);
                        this.resetBatchSize();
                        removeItemsFromQueue = true;
                    }
                } else {
                    // successful network request+response; remove each item in batch from queue
                    // (even if it was e.g. a 400, in which case retrying won't help)
                    removeItemsFromQueue = true;
                }

                if (removeItemsFromQueue) {
                    this.queue.removeItemsByID(_utils._.map(batch, function (item) {
                        return item['id'];
                    }), _utils._.bind(function (success) {
                        if (success) {
                            this.removalFailures = 0;
                            this.flush();
                        } else {
                            this.removalFailures = this.removalFailures + 1;
                            logger.error('failed to remove items from batched queue ' + this.removalFailures + ' times.');
                            if (this.removalFailures > MAX_REMOVE_FAILURE) {
                                logger.error('stop batching because too m any errors remove from storage');
                                this.stopAllBatching();
                            } else {
                                this.resetFlush();
                            }
                        }
                    }, this) // handle next batch if the queue isn't empty
                    );
                }
            } catch (err) {
                logger.error('Error handling API response', err);
                this.resetFlush();
            }
        }, this);
        var requestOptions = {
            method: 'POST',
            verbose: true,
            ignore_json_errors: true, // eslint-disable-line camelcase
            timeout_ms: timeoutMS // eslint-disable-line camelcase
        };
        if (options.sendBeacon) {
            requestOptions.transport = 'sendBeacon';
        }
        logger.log('Moesif Request:', this.endpoint, dataForRequest);
        this.sendRequest(this.endpoint, dataForRequest, requestOptions, batchSendCallback);
    } catch (err) {
        logger.error('Error flushing request queue', err);
        this.resetFlush();
    }
};

exports.RequestBatcher = RequestBatcher;

},{"./request-queue":14,"./utils":16}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _utils = require('./utils');

// eslint-disable-line

var _sharedLock = require('./shared-lock');

var logger = (0, _utils.console_with_prefix)('batch');

var DEFAULT_STORAGE_EXPIRATION = 6 * 60 * 60 * 1000; // 6 hours.

/**
 * RequestQueue: queue for batching API requests with localStorage backup for retries.
 * Maintains an in-memory queue which represents the source of truth for the current
 * page, but also writes all items out to a copy in the browser's localStorage, which
 * can be read on subsequent pageloads and retried. For batchability, all the request
 * items in the queue should be of the same type (events, people updates, group updates)
 * so they can be sent in a single request to the same API endpoint.
 *
 * LocalStorage keying and locking: In order for reloads and subsequent pageloads of
 * the same site to access the same persisted data, they must share the same localStorage
 * key (for instance based on project token and queue type). Therefore access to the
 * localStorage entry is guarded by an asynchronous mutex (SharedLock) to prevent
 * simultaneously open windows/tabs from overwriting each other's data (which would lead
 * to data loss in some situations).
 * @constructor
 */
var RequestQueue = function RequestQueue(storageKey, options) {
    options = options || {};
    this.storageKey = storageKey;
    this.storage = options.storage || window.localStorage;
    this.lock = new _sharedLock.SharedLock(storageKey, { storage: this.storage });
    this.storageExpiration = options.storageExpiration || DEFAULT_STORAGE_EXPIRATION;

    this.pid = options.pid || null; // pass pid to test out storage lock contention scenarios

    this.memQueue = [];
};

/**
 * Add one item to queues (memory and localStorage). The queued entry includes
 * the given item along with an auto-generated ID and a "flush-after" timestamp.
 * It is expected that the item will be sent over the network and dequeued
 * before the flush-after time; if this doesn't happen it is considered orphaned
 * (e.g., the original tab where it was enqueued got closed before it could be
 * sent) and the item can be sent by any tab that finds it in localStorage.
 *
 * The final callback param is called with a param indicating success or
 * failure of the enqueue operation; it is asynchronous because the localStorage
 * lock is asynchronous.
 */
RequestQueue.prototype.enqueue = function (item, flushInterval, cb) {
    var queueEntry = {
        'id': (0, _utils.cheap_guid)(),
        'flushAfter': new Date().getTime() + flushInterval * 2,
        'payload': item
    };

    this.lock.withLock(_utils._.bind(function lockAcquired() {
        var succeeded;
        try {
            var storedQueue = this.readFromStorage();
            storedQueue.push(queueEntry);
            succeeded = this.saveToStorage(storedQueue);
            if (succeeded) {
                // only add to in-memory queue when storage succeeds
                logger.log('succeeded saving to storage');
                this.memQueue.push(queueEntry);
            }
        } catch (err) {
            logger.error('Error enqueueing item', item);
            succeeded = false;
        }
        if (cb) {
            cb(succeeded);
        }
    }, this), function lockFailure(err) {
        logger.error('Error acquiring storage lock', err);
        if (cb) {
            cb(false);
        }
    }, this.pid);
};

/**
 * Read out the given number of queue entries. If this.memQueue
 * has fewer than batchSize items, then look for "orphaned" items
 * in the persisted queue (items where the 'flushAfter' time has
 * already passed).
 */
RequestQueue.prototype.fillBatch = function (batchSize) {
    this.memQueue = filterOutIDsAndInvalid(this.memQueue, {}, this.storageExpiration);
    var batch = this.memQueue.slice(0, batchSize);

    if (batch.length < batchSize) {
        // don't need lock just to read events; localStorage is thread-safe
        // and the worst that could happen is a duplicate send of some
        // orphaned events, which will be deduplicated on the server side
        var storedQueue = this.readFromStorage();
        logger.log('current storedQueue size ' + storedQueue.length);
        if (storedQueue.length) {
            // item IDs already in batch; don't duplicate out of storage
            var idsInBatch = {}; // poor man's Set
            _utils._.each(batch, function (item) {
                idsInBatch[item['id']] = true;
            });

            for (var i = 0; i < storedQueue.length; i++) {
                var item = storedQueue[i];
                var currentTime = new Date().getTime();

                var expirationTime = currentTime - this.storageExpiration;

                if (currentTime > item['flushAfter'] && item['flushAfter'] >= expirationTime && !idsInBatch[item['id']]) {
                    batch.push(item);
                    if (batch.length >= batchSize) {
                        break;
                    }
                } else {
                    logger.log('fill batch filtered item because invalid or expired' + (0, _utils.JSONStringify)(item));
                }
            }
        }
    }
    return batch;
};

/**
 * Remove items with matching 'id' from array (immutably)
 * also remove any item without a valid id (e.g., malformed
 * storage entries).
 */
var filterOutIDsAndInvalid = function filterOutIDsAndInvalid(items, idSet, storageExpiration) {
    var filteredItems = [];
    var currentTime = new Date().getTime();

    var expirationTime = currentTime - storageExpiration;
    logger.log('expiration time is ' + expirationTime);

    _utils._.each(items, function (item) {
        if (item['id'] && !idSet[item['id']]) {
            if (item['flushAfter'] && item['flushAfter'] >= expirationTime) {
                filteredItems.push(item);
            }
        } else {
            logger.log('filtered out item because invalid or expired' + (0, _utils.JSONStringify)(item));
        }
    });
    return filteredItems;
};

/**
 * Remove items with matching IDs from both in-memory queue
 * and persisted queue
 */
RequestQueue.prototype.removeItemsByID = function (ids, cb) {
    var idSet = {}; // poor man's Set
    _utils._.each(ids, function (id) {
        idSet[id] = true;
    });

    this.memQueue = filterOutIDsAndInvalid(this.memQueue, idSet, this.storageExpiration);

    var removeFromStorage = _utils._.bind(function () {
        var succeeded;
        try {
            var storedQueue = this.readFromStorage();
            storedQueue = filterOutIDsAndInvalid(storedQueue, idSet, this.storageExpiration);
            succeeded = this.saveToStorage(storedQueue);
        } catch (err) {
            logger.error('Error removing items', ids);
            succeeded = false;
        }
        return succeeded;
    }, this);

    this.lock.withLock(_utils._.bind(function lockAcquired() {
        var succeeded = removeFromStorage();
        if (cb) {
            logger.log('triggering callback of removalItems');
            cb(succeeded);
        }
    }, this), _utils._.bind(function lockFailure(err) {
        var succeeded = false;
        logger.error('Error acquiring storage lock', err);
        if (!(0, _utils.localStorageSupported)(this.storage, true)) {
            succeeded = removeFromStorage();
            if (!succeeded) {
                // still can not remove from storage.
                // we stop using storage.
                logger.error('still can not remove from storage, thus stop using storage');

                try {
                    this.storage.removeItem(this.storageKey);
                } catch (err) {
                    logger.error('error clearing queue', err);
                }
            }
        }
        if (cb) {
            cb(succeeded);
        }
    }, this), this.pid);
};

/**
 * Read and parse items array from localStorage entry, handling
 * malformed/missing data if necessary.
 */
RequestQueue.prototype.readFromStorage = function () {
    var storageEntry;
    try {
        logger.log('trying to get storage with storage key ' + this.storageKey);
        storageEntry = this.storage.getItem(this.storageKey);
        if (storageEntry) {
            storageEntry = (0, _utils.JSONParse)(storageEntry);
            if (!_utils._.isArray(storageEntry)) {
                logger.error('Invalid storage entry:', storageEntry);
                storageEntry = null;
            }
        } else {
            logger.log('storageEntry is empty');
        }
    } catch (err) {
        logger.error('Error retrieving queue', err);
        storageEntry = null;
    }
    return storageEntry || [];
};

/**
 * Serialize the given items array to localStorage.
 */
RequestQueue.prototype.saveToStorage = function (queue) {
    try {
        this.storage.setItem(this.storageKey, (0, _utils.JSONStringify)(queue));
        return true;
    } catch (err) {
        logger.error('Error saving queue', err);
        return false;
    }
};

/**
 * Clear out queues (memory and localStorage).
 */
RequestQueue.prototype.clear = function () {
    this.memQueue = [];
    try {
        this.storage.removeItem(this.storageKey);
    } catch (err) {
        logger.error('Failed to clear storage', err);
    }
};

exports.RequestQueue = RequestQueue;

},{"./shared-lock":15,"./utils":16}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _utils = require('./utils');

// eslint-disable-line

var logger = (0, _utils.console_with_prefix)('lock');

/**
 * SharedLock: a mutex built on HTML5 localStorage, to ensure that only one browser
 * window/tab at a time will be able to access shared resources.
 *
 * Implementation based on the original version by David Wolever (https://github.com/wolever)
 * at https://gist.github.com/wolever/5fd7573d1ef6166e8f8c4af286a69432.
 *
 * @example
 * var myLock = new SharedLock('some-key');
 * myLock.withLock(function() {
 *   console.log('I hold the mutex!');
 * });
 *
 * @constructor
 */
var SharedLock = function SharedLock(key, options) {
    options = options || {};

    this.storageKey = key;
    this.storage = options.storage || window.localStorage;
    this.pollIntervalMS = options.pollIntervalMS || 100;
    this.timeoutMS = options.timeoutMS || 2000;
};

// pass in a specific pid to test contention scenarios; otherwise
// it is chosen randomly for each acquisition attempt
SharedLock.prototype.withLock = function (lockedCB, errorCB, pid) {
    if (!pid && typeof errorCB !== 'function') {
        pid = errorCB;
        errorCB = null;
    }

    var i = pid || new Date().getTime() + '|' + Math.random();
    var startTime = new Date().getTime();

    var key = this.storageKey;
    var pollIntervalMS = this.pollIntervalMS;
    var timeoutMS = this.timeoutMS;
    var storage = this.storage;

    var keyX = key + ':X';
    var keyY = key + ':Y';
    var keyZ = key + ':Z';

    var reportError = function reportError(err) {
        errorCB && errorCB(err);
    };

    var delay = function delay(cb) {
        if (new Date().getTime() - startTime > timeoutMS) {
            logger.error('Timeout waiting for mutex on ' + key + '; clearing lock. [' + i + ']');
            storage.removeItem(keyZ);
            storage.removeItem(keyY);
            loop();
            return;
        }
        setTimeout(function () {
            try {
                cb();
            } catch (err) {
                reportError(err);
            }
        }, pollIntervalMS * (Math.random() + 0.1));
    };

    var waitFor = function waitFor(predicate, cb) {
        if (predicate()) {
            cb();
        } else {
            delay(function () {
                waitFor(predicate, cb);
            });
        }
    };

    var getSetY = function getSetY() {
        var valY = storage.getItem(keyY);
        if (valY && valY !== i) {
            // if Y == i then this process already has the lock (useful for test cases)
            return false;
        } else {
            storage.setItem(keyY, i);
            if (storage.getItem(keyY) === i) {
                return true;
            } else {
                if (!(0, _utils.localStorageSupported)(storage, true)) {
                    throw new Error('localStorage support dropped while acquiring lock');
                }
                return false;
            }
        }
    };

    var loop = function loop() {
        storage.setItem(keyX, i);

        waitFor(getSetY, function () {
            if (storage.getItem(keyX) === i) {
                criticalSection();
                return;
            }

            delay(function () {
                if (storage.getItem(keyY) !== i) {
                    loop();
                    return;
                }
                waitFor(function () {
                    return !storage.getItem(keyZ);
                }, criticalSection);
            });
        });
    };

    var criticalSection = function criticalSection() {
        storage.setItem(keyZ, '1');
        try {
            lockedCB();
        } finally {
            storage.removeItem(keyZ);
            if (storage.getItem(keyY) === i) {
                storage.removeItem(keyY);
            }
            if (storage.getItem(keyX) === i) {
                storage.removeItem(keyX);
            }
        }
    };

    try {
        if ((0, _utils.localStorageSupported)(storage, true)) {
            loop();
        } else {
            throw new Error('localStorage support check failed');
        }
    } catch (err) {
        reportError(err);
    }
};

exports.SharedLock = SharedLock;

},{"./utils":16}],16:[function(require,module,exports){
/* eslint camelcase: "off", eqeqeq: "off" */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

// since es6 imports are static and we run unit tests from the console, window won't be defined when importing this file
var win;
if (typeof window === 'undefined') {
    var loc = {
        hostname: ''
    };
    exports.window = win = {
        navigator: { userAgent: '' },
        document: {
            location: loc,
            referrer: ''
        },
        screen: { width: 0, height: 0 },
        location: loc
    };
} else {
    exports.window = win = window;
}

/*
 * Saved references to long variable names, so that closure compiler can
 * minimize file size.
 */

var ArrayProto = Array.prototype,
    FuncProto = Function.prototype,
    ObjProto = Object.prototype,
    slice = ArrayProto.slice,
    toString = ObjProto.toString,
    hasOwnProperty = ObjProto.hasOwnProperty,
    windowConsole = win.console,
    navigator = win.navigator,
    document = win.document,
    windowOpera = win.opera,
    screen = win.screen,
    userAgent = navigator.userAgent;

var nativeBind = FuncProto.bind,
    nativeForEach = ArrayProto.forEach,
    nativeIndexOf = ArrayProto.indexOf,
    nativeMap = ArrayProto.map,
    nativeIsArray = Array.isArray,
    breaker = {};

var _ = {
    trim: function trim(str) {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim#Polyfill
        return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    }
};

// Console override
var console = {
    /** @type {function(...*)} */
    log: function log() {
        if (_config2['default'].DEBUG && !_.isUndefined(windowConsole) && windowConsole) {
            try {
                windowConsole.log.apply(windowConsole, arguments);
            } catch (err) {
                _.each(arguments, function (arg) {
                    windowConsole.log(arg);
                });
            }
        }
    },
    /** @type {function(...*)} */
    error: function error() {
        if (_config2['default'].DEBUG && !_.isUndefined(windowConsole) && windowConsole) {
            var args = ['Moesif error:'].concat(_.toArray(arguments));
            try {
                windowConsole.error.apply(windowConsole, args);
            } catch (err) {
                _.each(args, function (arg) {
                    windowConsole.error(arg);
                });
            }
        }
    },
    /** @type {function(...*)} */
    critical: function critical() {
        if (!_.isUndefined(windowConsole) && windowConsole) {
            var args = ['Moesif error:'].concat(_.toArray(arguments));
            try {
                windowConsole.error.apply(windowConsole, args);
            } catch (err) {
                _.each(args, function (arg) {
                    windowConsole.error(arg);
                });
            }
        }
    }
};

var log_func_with_prefix = function log_func_with_prefix(func, prefix) {
    return function () {
        arguments[0] = '[' + prefix + '] ' + arguments[0];
        return func.apply(console, arguments);
    };
};
var console_with_prefix = function console_with_prefix(prefix) {
    return {
        log: log_func_with_prefix(console.log, prefix),
        error: log_func_with_prefix(console.error, prefix),
        critical: log_func_with_prefix(console.critical, prefix)
    };
};

// UNDERSCORE
// Embed part of the Underscore Library
_.bind = function (func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) {
        return nativeBind.apply(func, slice.call(arguments, 1));
    }
    if (!_.isFunction(func)) {
        throw new TypeError();
    }
    args = slice.call(arguments, 2);
    bound = function () {
        if (!(this instanceof bound)) {
            return func.apply(context, args.concat(slice.call(arguments)));
        }
        var ctor = {};
        ctor.prototype = func.prototype;
        var self = new ctor();
        ctor.prototype = null;
        var result = func.apply(self, args.concat(slice.call(arguments)));
        if (Object(result) === result) {
            return result;
        }
        return self;
    };
    return bound;
};

_.bind_instance_methods = function (obj) {
    for (var func in obj) {
        if (typeof obj[func] === 'function') {
            obj[func] = _.bind(obj[func], obj);
        }
    }
};

/**
 * @param {*=} obj
 * @param {function(...*)=} iterator
 * @param {Object=} context
 */
_.each = function (obj, iterator, context) {
    if (obj === null || obj === undefined) {
        return;
    }
    if (nativeForEach && obj.forEach === nativeForEach) {
        obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
        for (var i = 0, l = obj.length; i < l; i++) {
            if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) {
                return;
            }
        }
    } else {
        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                if (iterator.call(context, obj[key], key, obj) === breaker) {
                    return;
                }
            }
        }
    }
};

_.escapeHTML = function (s) {
    var escaped = s;
    if (escaped && _.isString(escaped)) {
        escaped = escaped.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    return escaped;
};

_.extend = function (obj) {
    _.each(slice.call(arguments, 1), function (source) {
        for (var prop in source) {
            if (source[prop] !== void 0) {
                obj[prop] = source[prop];
            }
        }
    });
    return obj;
};

_.isArray = nativeIsArray || function (obj) {
    return toString.call(obj) === '[object Array]';
};

// from a comment on http://dbj.org/dbj/?p=286
// fails on only one very rare and deliberate custom object:
// var bomb = { toString : undefined, valueOf: function(o) { return "function BOMBA!"; }};
_.isFunction = function (f) {
    try {
        return (/^\s*\bfunction\b/.test(f)
        );
    } catch (x) {
        return false;
    }
};

_.isArguments = function (obj) {
    return !!(obj && hasOwnProperty.call(obj, 'callee'));
};

_.toArray = function (iterable) {
    if (!iterable) {
        return [];
    }
    if (iterable.toArray) {
        return iterable.toArray();
    }
    if (_.isArray(iterable)) {
        return slice.call(iterable);
    }
    if (_.isArguments(iterable)) {
        return slice.call(iterable);
    }
    return _.values(iterable);
};

_.map = function (arr, callback) {
    if (nativeMap && arr.map === nativeMap) {
        return arr.map(callback);
    } else {
        var results = [];
        _.each(arr, function (item) {
            results.push(callback(item));
        });
        return results;
    }
};

_.keys = function (obj) {
    var results = [];
    if (obj === null) {
        return results;
    }
    _.each(obj, function (value, key) {
        results[results.length] = key;
    });
    return results;
};

_.values = function (obj) {
    var results = [];
    if (obj === null) {
        return results;
    }
    _.each(obj, function (value) {
        results[results.length] = value;
    });
    return results;
};

_.identity = function (value) {
    return value;
};

_.include = function (obj, target) {
    var found = false;
    if (obj === null) {
        return found;
    }
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) {
        return obj.indexOf(target) != -1;
    }
    _.each(obj, function (value) {
        if (found || (found = value === target)) {
            return breaker;
        }
    });
    return found;
};

_.includes = function (str, needle) {
    return str.indexOf(needle) !== -1;
};

// Underscore Addons
_.inherit = function (subclass, superclass) {
    subclass.prototype = new superclass();
    subclass.prototype.constructor = subclass;
    subclass.superclass = superclass.prototype;
    return subclass;
};

_.isArrayBuffer = function (value) {
    var toString = Object.prototype.toString;
    var hasArrayBuffer = typeof ArrayBuffer === 'function';
    return hasArrayBuffer && (value instanceof ArrayBuffer || toString.call(value) === '[object ArrayBuffer]');
};

_.isObject = function (obj) {
    return obj === Object(obj) && !_.isArray(obj);
};

_.isEmptyObject = function (obj) {
    if (_.isObject(obj)) {
        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                return false;
            }
        }
        return true;
    }
    return false;
};

_.isEmptyString = function isEmptyString(str) {
    return !str || str.length === 0;
};

_.isUndefined = function (obj) {
    return obj === void 0;
};

_.isString = function (obj) {
    return toString.call(obj) == '[object String]';
};

_.isDate = function (obj) {
    return toString.call(obj) == '[object Date]';
};

_.isNumber = function (obj) {
    return toString.call(obj) == '[object Number]';
};

_.isElement = function (obj) {
    return !!(obj && obj.nodeType === 1);
};

_.isNil = function (val) {
    return _.isUndefined(val) || val === null;
};

_.encodeDates = function (obj) {
    _.each(obj, function (v, k) {
        if (_.isDate(v)) {
            obj[k] = _.formatDate(v);
        } else if (_.isObject(v)) {
            obj[k] = _.encodeDates(v); // recurse
        }
    });
    return obj;
};

_.timestamp = function () {
    Date.now = Date.now || function () {
        return +new Date();
    };
    return Date.now();
};

_.formatDate = function (d) {
    // YYYY-MM-DDTHH:MM:SS in UTC
    function pad(n) {
        return n < 10 ? '0' + n : n;
    }
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
};

_.safewrap = function (f) {
    return function () {
        try {
            return f.apply(this, arguments);
        } catch (e) {
            console.critical('Implementation error. Please turn on debug and contact support@Moesif.com.');
            if (_config2['default'].DEBUG) {
                console.critical(e);
            }
        }
    };
};

_.safewrap_class = function (klass, functions) {
    for (var i = 0; i < functions.length; i++) {
        klass.prototype[functions[i]] = _.safewrap(klass.prototype[functions[i]]);
    }
};

_.safewrap_instance_methods = function (obj) {
    for (var func in obj) {
        if (typeof obj[func] === 'function') {
            obj[func] = _.safewrap(obj[func]);
        }
    }
};

_.strip_empty_properties = function (p) {
    var ret = {};
    _.each(p, function (v, k) {
        if (_.isString(v) && v.length > 0) {
            ret[k] = v;
        }
    });
    return ret;
};

/*
 * this function returns a copy of object after truncating it.  If
 * passed an Array or Object it will iterate through obj and
 * truncate all the values recursively.
 */
_.truncate = function (obj, length) {
    var ret;

    if (typeof obj === 'string') {
        ret = obj.slice(0, length);
    } else if (_.isArray(obj)) {
        ret = [];
        _.each(obj, function (val) {
            ret.push(_.truncate(val, length));
        });
    } else if (_.isObject(obj)) {
        ret = {};
        _.each(obj, function (val, key) {
            ret[key] = _.truncate(val, length);
        });
    } else {
        ret = obj;
    }

    return ret;
};

_.JSONEncode = (function () {
    return function (mixed_val) {
        var value = mixed_val;
        var quote = function quote(string) {
            var escapable = /[\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g; // eslint-disable-line no-control-regex
            var meta = { // table of character substitutions
                '\b': '\\b',
                '\t': '\\t',
                '\n': '\\n',
                '\f': '\\f',
                '\r': '\\r',
                '"': '\\"',
                '\\': '\\\\'
            };

            escapable.lastIndex = 0;
            return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' : '"' + string + '"';
        };

        var str = function str(key, holder) {
            var gap = '';
            var indent = '    ';
            var i = 0; // The loop counter.
            var k = ''; // The member key.
            var v = ''; // The member value.
            var length = 0;
            var mind = gap;
            var partial = [];
            var value = holder[key];

            // If the value has a toJSON method, call it to obtain a replacement value.
            if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
                value = value.toJSON(key);
            }

            // What happens next depends on the value's type.
            switch (typeof value) {
                case 'string':
                    return quote(value);

                case 'number':
                    // JSON numbers must be finite. Encode non-finite numbers as null.
                    return isFinite(value) ? String(value) : 'null';

                case 'boolean':
                case 'null':
                    // If the value is a boolean or null, convert it to a string. Note:
                    // typeof null does not produce 'null'. The case is included here in
                    // the remote chance that this gets fixed someday.

                    return String(value);

                case 'object':
                    // If the type is 'object', we might be dealing with an object or an array or
                    // null.
                    // Due to a specification blunder in ECMAScript, typeof null is 'object',
                    // so watch out for that case.
                    if (!value) {
                        return 'null';
                    }

                    // Make an array to hold the partial results of stringifying this object value.
                    gap += indent;
                    partial = [];

                    // Is the value an array?
                    if (toString.apply(value) === '[object Array]') {
                        // The value is an array. Stringify every element. Use null as a placeholder
                        // for non-JSON values.

                        length = value.length;
                        for (i = 0; i < length; i += 1) {
                            partial[i] = str(i, value) || 'null';
                        }

                        // Join all of the elements together, separated with commas, and wrap them in
                        // brackets.
                        v = partial.length === 0 ? '[]' : gap ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' : '[' + partial.join(',') + ']';
                        gap = mind;
                        return v;
                    }

                    // Iterate through all of the keys in the object.
                    for (k in value) {
                        if (hasOwnProperty.call(value, k)) {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }

                    // Join all of the member texts together, separated with commas,
                    // and wrap them in braces.
                    v = partial.length === 0 ? '{}' : gap ? '{' + partial.join(',') + '' + mind + '}' : '{' + partial.join(',') + '}';
                    gap = mind;
                    return v;
            }
        };

        // Make a fake root object containing our value under the key of ''.
        // Return the result of stringifying the value.
        return str('', {
            '': value
        });
    };
})();

/**
 * From https://github.com/douglascrockford/JSON-js/blob/master/json_parse.js
 * Slightly modified to throw a real Error rather than a POJO
 */
_.JSONDecode = (function () {
    var at,
        // The index of the current character
    ch,
        // The current character
    escapee = {
        '"': '"',
        '\\': '\\',
        '/': '/',
        'b': '\b',
        'f': '\f',
        'n': '\n',
        'r': '\r',
        't': '\t'
    },
        text,
        error = function error(m) {
        var e = new SyntaxError(m);
        e.at = at;
        e.text = text;
        throw e;
    },
        next = function next(c) {
        // If a c parameter is provided, verify that it matches the current character.
        if (c && c !== ch) {
            error('Expected \'' + c + '\' instead of \'' + ch + '\'');
        }
        // Get the next character. When there are no more characters,
        // return the empty string.
        ch = text.charAt(at);
        at += 1;
        return ch;
    },
        number = function number() {
        // Parse a number value.
        var number,
            string = '';

        if (ch === '-') {
            string = '-';
            next('-');
        }
        while (ch >= '0' && ch <= '9') {
            string += ch;
            next();
        }
        if (ch === '.') {
            string += '.';
            while (next() && ch >= '0' && ch <= '9') {
                string += ch;
            }
        }
        if (ch === 'e' || ch === 'E') {
            string += ch;
            next();
            if (ch === '-' || ch === '+') {
                string += ch;
                next();
            }
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
        }
        number = +string;
        if (!isFinite(number)) {
            error('Bad number');
        } else {
            return number;
        }
    },
        string = function string() {
        // Parse a string value.
        var hex,
            i,
            string = '',
            uffff;
        // When parsing for string values, we must look for " and \ characters.
        if (ch === '"') {
            while (next()) {
                if (ch === '"') {
                    next();
                    return string;
                }
                if (ch === '\\') {
                    next();
                    if (ch === 'u') {
                        uffff = 0;
                        for (i = 0; i < 4; i += 1) {
                            hex = parseInt(next(), 16);
                            if (!isFinite(hex)) {
                                break;
                            }
                            uffff = uffff * 16 + hex;
                        }
                        string += String.fromCharCode(uffff);
                    } else if (typeof escapee[ch] === 'string') {
                        string += escapee[ch];
                    } else {
                        break;
                    }
                } else {
                    string += ch;
                }
            }
        }
        error('Bad string');
    },
        white = function white() {
        // Skip whitespace.
        while (ch && ch <= ' ') {
            next();
        }
    },
        word = function word() {
        // true, false, or null.
        switch (ch) {
            case 't':
                next('t');
                next('r');
                next('u');
                next('e');
                return true;
            case 'f':
                next('f');
                next('a');
                next('l');
                next('s');
                next('e');
                return false;
            case 'n':
                next('n');
                next('u');
                next('l');
                next('l');
                return null;
        }
        error('Unexpected "' + ch + '"');
    },
        value,
        // Placeholder for the value function.
    array = function array() {
        // Parse an array value.
        var array = [];

        if (ch === '[') {
            next('[');
            white();
            if (ch === ']') {
                next(']');
                return array; // empty array
            }
            while (ch) {
                array.push(value());
                white();
                if (ch === ']') {
                    next(']');
                    return array;
                }
                next(',');
                white();
            }
        }
        error('Bad array');
    },
        object = function object() {
        // Parse an object value.
        var key,
            object = {};

        if (ch === '{') {
            next('{');
            white();
            if (ch === '}') {
                next('}');
                return object; // empty object
            }
            while (ch) {
                key = string();
                white();
                next(':');
                if (Object.hasOwnProperty.call(object, key)) {
                    error('Duplicate key "' + key + '"');
                }
                object[key] = value();
                white();
                if (ch === '}') {
                    next('}');
                    return object;
                }
                next(',');
                white();
            }
        }
        error('Bad object');
    };

    value = function () {
        // Parse a JSON value. It could be an object, an array, a string,
        // a number, or a word.
        white();
        switch (ch) {
            case '{':
                return object();
            case '[':
                return array();
            case '"':
                return string();
            case '-':
                return number();
            default:
                return ch >= '0' && ch <= '9' ? number() : word();
        }
    };

    // Return the json_parse function. It will have access to all of the
    // above functions and variables.
    return function (source) {
        var result;

        text = source;
        at = 0;
        ch = ' ';
        result = value();
        white();
        if (ch) {
            error('Syntax error');
        }

        return result;
    };
})();

_.base64Encode = function (data) {
    var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var o1,
        o2,
        o3,
        h1,
        h2,
        h3,
        h4,
        bits,
        i = 0,
        ac = 0,
        enc = '',
        tmp_arr = [];

    if (!data) {
        return data;
    }

    data = _.utf8Encode(data);

    do {
        // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1 << 16 | o2 << 8 | o3;

        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
            break;
        case 2:
            enc = enc.slice(0, -1) + '=';
            break;
    }

    return enc;
};

_.utf8Encode = function (string) {
    string = (string + '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    var utftext = '',
        start,
        end;
    var stringl = 0,
        n;

    start = end = 0;
    stringl = string.length;

    for (n = 0; n < stringl; n++) {
        var c1 = string.charCodeAt(n);
        var enc = null;

        if (c1 < 128) {
            end++;
        } else if (c1 > 127 && c1 < 2048) {
            enc = String.fromCharCode(c1 >> 6 | 192, c1 & 63 | 128);
        } else {
            enc = String.fromCharCode(c1 >> 12 | 224, c1 >> 6 & 63 | 128, c1 & 63 | 128);
        }
        if (enc !== null) {
            if (end > start) {
                utftext += string.substring(start, end);
            }
            utftext += enc;
            start = end = n + 1;
        }
    }

    if (end > start) {
        utftext += string.substring(start, string.length);
    }

    return utftext;
};

_.UUID = (function () {

    // Time/ticks information
    // 1*new Date() is a cross browser version of Date.now()
    var T = function T() {
        var d = 1 * new Date(),
            i = 0;

        // this while loop figures how many browser ticks go by
        // before 1*new Date() returns a new number, ie the amount
        // of ticks that go by per millisecond
        while (d == 1 * new Date()) {
            i++;
        }

        return d.toString(16) + i.toString(16);
    };

    // Math.Random entropy
    var R = function R() {
        return Math.random().toString(16).replace('.', '');
    };

    // User agent entropy
    // This function takes the user agent string, and then xors
    // together each sequence of 8 bytes.  This produces a final
    // sequence of 8 bytes which it returns as hex.
    var UA = function UA() {
        var ua = userAgent,
            i,
            ch,
            buffer = [],
            ret = 0;

        function xor(result, byte_array) {
            var j,
                tmp = 0;
            for (j = 0; j < byte_array.length; j++) {
                tmp |= buffer[j] << j * 8;
            }
            return result ^ tmp;
        }

        for (i = 0; i < ua.length; i++) {
            ch = ua.charCodeAt(i);
            buffer.unshift(ch & 0xFF);
            if (buffer.length >= 4) {
                ret = xor(ret, buffer);
                buffer = [];
            }
        }

        if (buffer.length > 0) {
            ret = xor(ret, buffer);
        }

        return ret.toString(16);
    };

    return function () {
        var se = (screen.height * screen.width).toString(16);
        return T() + '-' + R() + '-' + UA() + '-' + se;
    };
})();

_.uuid4 = function () {
    // based on
    // https://github.com/tracker1/node-uuid4/blob/master/browser.js
    var temp_url = URL.createObjectURL(new Blob());
    var uuid = temp_url.toString();
    URL.revokeObjectURL(temp_url);
    return uuid.split(/[:\/]/g).pop().toLowerCase(); // remove prefixes
};

// _.isBlockedUA()
// This is to block various web spiders from executing our JS and
// sending false tracking data
_.isBlockedUA = function (ua) {
    if (/(google web preview|baiduspider|yandexbot|bingbot|googlebot|yahoo! slurp)/i.test(ua)) {
        return true;
    }
    return false;
};

/**
 * @param {Object=} formdata
 * @param {string=} arg_separator
 */
_.HTTPBuildQuery = function (formdata, arg_separator) {
    var use_val,
        use_key,
        tmp_arr = [];

    if (_.isUndefined(arg_separator)) {
        arg_separator = '&';
    }

    _.each(formdata, function (val, key) {
        use_val = encodeURIComponent(val.toString());
        use_key = encodeURIComponent(key);
        tmp_arr[tmp_arr.length] = use_key + '=' + use_val;
    });

    return tmp_arr.join(arg_separator);
};

function splitFromQuestionMark(myHref) {
    if (myHref) {
        var startOfQuery = myHref.indexOf('?');
        if (startOfQuery >= 0) {
            var res = myHref.substring(startOfQuery);
            return res;
        }
    }
    return '';
}

_.getUrlParams = function () {
    return location && (location.search || splitFromQuestionMark(location.href));
};

_.getQueryParamByName = function (name, query) {
    // expects a name
    // and a query string. aka location part.
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(query);
    return results === null ? undefined : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

_.getQueryParam = function (url, param) {
    // Expects a raw URL

    param = param.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
    var regexS = '[\\?&]' + param + '=([^&#]*)',
        regex = new RegExp(regexS),
        results = regex.exec(url);
    if (results === null || results && typeof results[1] !== 'string' && results[1].length) {
        return '';
    } else {
        var result = results[1];
        try {
            result = decodeURIComponent(result);
        } catch (err) {
            console.error('Skipping decoding for malformed query param: ' + result);
        }
        return result.replace(/\+/g, ' ');
    }
};

_.getHashParam = function (hash, param) {
    var matches = hash.match(new RegExp(param + '=([^&]*)'));
    return matches ? matches[1] : null;
};

// _.cookie
// Methods partially borrowed from quirksmode.org/js/cookies.html
_.cookie = {
    get: function get(name) {
        var nameEQ = name + '=';
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
        return null;
    },

    parse: function parse(name) {
        var cookie;
        try {
            cookie = _.JSONDecode(_.cookie.get(name)) || {};
        } catch (err) {
            // noop
        }
        return cookie;
    },

    set_seconds: function set_seconds(name, value, seconds, is_cross_subdomain, is_secure, is_cross_site, domain_override) {
        var cdomain = '',
            expires = '',
            secure = '';

        if (domain_override) {
            cdomain = '; domain=' + domain_override;
        } else if (is_cross_subdomain) {
            var domain = extract_domain(document.location.hostname);
            cdomain = domain ? '; domain=.' + domain : '';
        }

        if (seconds) {
            var date = new Date();
            date.setTime(date.getTime() + seconds * 1000);
            expires = '; expires=' + date.toGMTString();
        }

        if (is_cross_site) {
            is_secure = true;
            secure = '; SameSite=None';
        }
        if (is_secure) {
            secure += '; secure';
        }

        document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/' + cdomain + secure;
    },

    set: function set(name, value, days, is_cross_subdomain, is_secure, is_cross_site, domain_override) {
        var cdomain = '',
            expires = '',
            secure = '';

        if (domain_override) {
            cdomain = '; domain=' + domain_override;
        } else if (is_cross_subdomain) {
            var domain = extract_domain(document.location.hostname);
            cdomain = domain ? '; domain=.' + domain : '';
        }

        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            expires = '; expires=' + date.toGMTString();
        }

        if (is_cross_site) {
            is_secure = true;
            secure = '; SameSite=None';
        }
        if (is_secure) {
            secure += '; secure';
        }

        var new_cookie_val = name + '=' + encodeURIComponent(value) + expires + '; path=/' + cdomain + secure;
        document.cookie = new_cookie_val;
        return new_cookie_val;
    },

    remove: function remove(name, is_cross_subdomain, domain_override) {
        _.cookie.set(name, '', -1, is_cross_subdomain, false, false, domain_override);
    }
};

var _localStorageSupported = null;
var localStorageSupported = function localStorageSupported(storage, forceCheck) {
    if (_localStorageSupported !== null && !forceCheck) {
        return _localStorageSupported;
    }

    var supported = true;
    try {
        storage = storage || window.localStorage;
        var key = '__mplss_' + cheap_guid(8),
            val = 'xyz';
        storage.setItem(key, val);
        if (storage.getItem(key) !== val) {
            supported = false;
        }
        storage.removeItem(key);
    } catch (err) {
        supported = false;
    }

    _localStorageSupported = supported;
    return supported;
};

// _.localStorage
_.localStorage = {
    is_supported: function is_supported(force_check) {
        var supported = localStorageSupported(null, force_check);
        if (!supported) {
            console.error('localStorage unsupported; falling back to cookie store');
        }
        return supported;
    },

    error: function error(msg) {
        console.error('localStorage error: ' + msg);
    },

    get: function get(name) {
        try {
            return window.localStorage.getItem(name);
        } catch (err) {
            _.localStorage.error(err);
        }
        return null;
    },

    parse: function parse(name) {
        try {
            return _.JSONDecode(_.localStorage.get(name)) || {};
        } catch (err) {
            // noop
        }
        return null;
    },

    set: function set(name, value) {
        try {
            window.localStorage.setItem(name, value);
        } catch (err) {
            _.localStorage.error(err);
        }
    },

    remove: function remove(name) {
        try {
            window.localStorage.removeItem(name);
        } catch (err) {
            _.localStorage.error(err);
        }
    }
};

_.register_event = (function () {
    // written by Dean Edwards, 2005
    // with input from Tino Zijdel - crisp@xs4all.nl
    // with input from Carl Sverre - mail@carlsverre.com
    // with input from Moesif
    // http://dean.edwards.name/weblog/2005/10/add-event/
    // https://gist.github.com/1930440

    /**
     * @param {Object} element
     * @param {string} type
     * @param {function(...*)} handler
     * @param {boolean=} oldSchool
     * @param {boolean=} useCapture
     */
    var register_event = function register_event(element, type, handler, oldSchool, useCapture) {
        if (!element) {
            console.error('No valid element provided to register_event');
            return;
        }

        if (element.addEventListener && !oldSchool) {
            element.addEventListener(type, handler, !!useCapture);
        } else {
            var ontype = 'on' + type;
            var old_handler = element[ontype]; // can be undefined
            element[ontype] = makeHandler(element, handler, old_handler);
        }
    };

    function makeHandler(element, new_handler, old_handlers) {
        var handler = function handler(event) {
            event = event || fixEvent(window.event);

            // this basically happens in firefox whenever another script
            // overwrites the onload callback and doesn't pass the event
            // object to previously defined callbacks.  All the browsers
            // that don't define window.event implement addEventListener
            // so the dom_loaded handler will still be fired as usual.
            if (!event) {
                return undefined;
            }

            var ret = true;
            var old_result, new_result;

            if (_.isFunction(old_handlers)) {
                old_result = old_handlers(event);
            }
            new_result = new_handler.call(element, event);

            if (false === old_result || false === new_result) {
                ret = false;
            }

            return ret;
        };

        return handler;
    }

    function fixEvent(event) {
        if (event) {
            event.preventDefault = fixEvent.preventDefault;
            event.stopPropagation = fixEvent.stopPropagation;
        }
        return event;
    }
    fixEvent.preventDefault = function () {
        this.returnValue = false;
    };
    fixEvent.stopPropagation = function () {
        this.cancelBubble = true;
    };

    return register_event;
})();

var TOKEN_MATCH_REGEX = new RegExp('^(\\w*)\\[(\\w+)([=~\\|\\^\\$\\*]?)=?"?([^\\]"]*)"?\\]$');

_.dom_query = (function () {
    /* document.getElementsBySelector(selector)
    - returns an array of element objects from the current document
    matching the CSS selector. Selectors can contain element names,
    class names and ids and can be nested. For example:
     elements = document.getElementsBySelector('div#main p a.external')
     Will return an array of all 'a' elements with 'external' in their
    class attribute that are contained inside 'p' elements that are
    contained inside the 'div' element which has id="main"
     New in version 0.4: Support for CSS2 and CSS3 attribute selectors:
    See http://www.w3.org/TR/css3-selectors/#attribute-selectors
     Version 0.4 - Simon Willison, March 25th 2003
    -- Works in Phoenix 0.5, Mozilla 1.3, Opera 7, Internet Explorer 6, Internet Explorer 5 on Windows
    -- Opera 7 fails
     Version 0.5 - Carl Sverre, Jan 7th 2013
    -- Now uses jQuery-esque `hasClass` for testing class name
    equality.  This fixes a bug related to '-' characters being
    considered not part of a 'word' in regex.
    */

    function getAllChildren(e) {
        // Returns all children of element. Workaround required for IE5/Windows. Ugh.
        return e.all ? e.all : e.getElementsByTagName('*');
    }

    var bad_whitespace = /[\t\r\n]/g;

    function hasClass(elem, selector) {
        var className = ' ' + selector + ' ';
        return (' ' + elem.className + ' ').replace(bad_whitespace, ' ').indexOf(className) >= 0;
    }

    function getElementsBySelector(selector) {
        // Attempt to fail gracefully in lesser browsers
        if (!document.getElementsByTagName) {
            return [];
        }
        // Split selector in to tokens
        var tokens = selector.split(' ');
        var token, bits, tagName, found, foundCount, i, j, k, elements, currentContextIndex;
        var currentContext = [document];
        for (i = 0; i < tokens.length; i++) {
            token = tokens[i].replace(/^\s+/, '').replace(/\s+$/, '');
            if (token.indexOf('#') > -1) {
                // Token is an ID selector
                bits = token.split('#');
                tagName = bits[0];
                var id = bits[1];
                var element = document.getElementById(id);
                if (!element || tagName && element.nodeName.toLowerCase() != tagName) {
                    // element not found or tag with that ID not found, return false
                    return [];
                }
                // Set currentContext to contain just this element
                currentContext = [element];
                continue; // Skip to next token
            }
            if (token.indexOf('.') > -1) {
                // Token contains a class selector
                bits = token.split('.');
                tagName = bits[0];
                var className = bits[1];
                if (!tagName) {
                    tagName = '*';
                }
                // Get elements matching tag, filter them for class selector
                found = [];
                foundCount = 0;
                for (j = 0; j < currentContext.length; j++) {
                    if (tagName == '*') {
                        elements = getAllChildren(currentContext[j]);
                    } else {
                        elements = currentContext[j].getElementsByTagName(tagName);
                    }
                    for (k = 0; k < elements.length; k++) {
                        found[foundCount++] = elements[k];
                    }
                }
                currentContext = [];
                currentContextIndex = 0;
                for (j = 0; j < found.length; j++) {
                    if (found[j].className && _.isString(found[j].className) && // some SVG elements have classNames which are not strings
                    hasClass(found[j], className)) {
                        currentContext[currentContextIndex++] = found[j];
                    }
                }
                continue; // Skip to next token
            }
            // Code to deal with attribute selectors
            var token_match = token.match(TOKEN_MATCH_REGEX);
            if (token_match) {
                tagName = token_match[1];
                var attrName = token_match[2];
                var attrOperator = token_match[3];
                var attrValue = token_match[4];
                if (!tagName) {
                    tagName = '*';
                }
                // Grab all of the tagName elements within current context
                found = [];
                foundCount = 0;
                for (j = 0; j < currentContext.length; j++) {
                    if (tagName == '*') {
                        elements = getAllChildren(currentContext[j]);
                    } else {
                        elements = currentContext[j].getElementsByTagName(tagName);
                    }
                    for (k = 0; k < elements.length; k++) {
                        found[foundCount++] = elements[k];
                    }
                }
                currentContext = [];
                currentContextIndex = 0;
                var checkFunction; // This function will be used to filter the elements
                switch (attrOperator) {
                    case '=':
                        // Equality
                        checkFunction = function (e) {
                            return e.getAttribute(attrName) == attrValue;
                        };
                        break;
                    case '~':
                        // Match one of space seperated words
                        checkFunction = function (e) {
                            return e.getAttribute(attrName).match(new RegExp('\\b' + attrValue + '\\b'));
                        };
                        break;
                    case '|':
                        // Match start with value followed by optional hyphen
                        checkFunction = function (e) {
                            return e.getAttribute(attrName).match(new RegExp('^' + attrValue + '-?'));
                        };
                        break;
                    case '^':
                        // Match starts with value
                        checkFunction = function (e) {
                            return e.getAttribute(attrName).indexOf(attrValue) === 0;
                        };
                        break;
                    case '$':
                        // Match ends with value - fails with "Warning" in Opera 7
                        checkFunction = function (e) {
                            return e.getAttribute(attrName).lastIndexOf(attrValue) == e.getAttribute(attrName).length - attrValue.length;
                        };
                        break;
                    case '*':
                        // Match ends with value
                        checkFunction = function (e) {
                            return e.getAttribute(attrName).indexOf(attrValue) > -1;
                        };
                        break;
                    default:
                        // Just test for existence of attribute
                        checkFunction = function (e) {
                            return e.getAttribute(attrName);
                        };
                }
                currentContext = [];
                currentContextIndex = 0;
                for (j = 0; j < found.length; j++) {
                    if (checkFunction(found[j])) {
                        currentContext[currentContextIndex++] = found[j];
                    }
                }
                // alert('Attribute Selector: '+tagName+' '+attrName+' '+attrOperator+' '+attrValue);
                continue; // Skip to next token
            }
            // If we get here, token is JUST an element (not a class or ID selector)
            tagName = token;
            found = [];
            foundCount = 0;
            for (j = 0; j < currentContext.length; j++) {
                elements = currentContext[j].getElementsByTagName(tagName);
                for (k = 0; k < elements.length; k++) {
                    found[foundCount++] = elements[k];
                }
            }
            currentContext = found;
        }
        return currentContext;
    }

    return function (query) {
        if (_.isElement(query)) {
            return [query];
        } else if (_.isObject(query) && !_.isUndefined(query.length)) {
            return query;
        } else {
            return getElementsBySelector.call(this, query);
        }
    };
})();

_.info = {
    campaignParams: function campaignParams() {
        var campaign_keywords = 'utm_source utm_medium utm_campaign utm_content utm_term'.split(' '),
            kw = '',
            params = {};
        _.each(campaign_keywords, function (kwkey) {
            kw = _.getQueryParam(document.URL, kwkey);
            if (kw.length) {
                params[kwkey] = kw;
            }
        });

        return params;
    },

    searchEngine: function searchEngine(referrer) {
        if (referrer.search('https?://(.*)google.([^/?]*)') === 0) {
            return 'google';
        } else if (referrer.search('https?://(.*)bing.com') === 0) {
            return 'bing';
        } else if (referrer.search('https?://(.*)yahoo.com') === 0) {
            return 'yahoo';
        } else if (referrer.search('https?://(.*)duckduckgo.com') === 0) {
            return 'duckduckgo';
        } else {
            return null;
        }
    },

    searchInfo: function searchInfo(referrer) {
        var search = _.info.searchEngine(referrer),
            param = search != 'yahoo' ? 'q' : 'p',
            ret = {};

        if (search !== null) {
            ret['$search_engine'] = search;

            var keyword = _.getQueryParam(referrer, param);
            if (keyword.length) {
                ret['mp_keyword'] = keyword;
            }
        }

        return ret;
    },

    /**
     * This function detects which browser is running this script.
     * The order of the checks are important since many user agents
     * include key words used in later checks.
     */
    browser: function browser(user_agent, vendor, opera) {
        vendor = vendor || ''; // vendor is undefined for at least IE9
        if (opera || _.includes(user_agent, ' OPR/')) {
            if (_.includes(user_agent, 'Mini')) {
                return 'Opera Mini';
            }
            return 'Opera';
        } else if (/(BlackBerry|PlayBook|BB10)/i.test(user_agent)) {
            return 'BlackBerry';
        } else if (_.includes(user_agent, 'IEMobile') || _.includes(user_agent, 'WPDesktop')) {
            return 'Internet Explorer Mobile';
        } else if (_.includes(user_agent, 'SamsungBrowser/')) {
            // https://developer.samsung.com/internet/user-agent-string-format
            return 'Samsung Internet';
        } else if (_.includes(user_agent, 'Edge') || _.includes(user_agent, 'Edg/')) {
            return 'Microsoft Edge';
        } else if (_.includes(user_agent, 'FBIOS')) {
            return 'Facebook Mobile';
        } else if (_.includes(user_agent, 'Chrome')) {
            return 'Chrome';
        } else if (_.includes(user_agent, 'CriOS')) {
            return 'Chrome iOS';
        } else if (_.includes(user_agent, 'UCWEB') || _.includes(user_agent, 'UCBrowser')) {
            return 'UC Browser';
        } else if (_.includes(user_agent, 'FxiOS')) {
            return 'Firefox iOS';
        } else if (_.includes(vendor, 'Apple')) {
            if (_.includes(user_agent, 'Mobile')) {
                return 'Mobile Safari';
            }
            return 'Safari';
        } else if (_.includes(user_agent, 'Android')) {
            return 'Android Mobile';
        } else if (_.includes(user_agent, 'Konqueror')) {
            return 'Konqueror';
        } else if (_.includes(user_agent, 'Firefox')) {
            return 'Firefox';
        } else if (_.includes(user_agent, 'MSIE') || _.includes(user_agent, 'Trident/')) {
            return 'Internet Explorer';
        } else if (_.includes(user_agent, 'Gecko')) {
            return 'Mozilla';
        } else {
            return '';
        }
    },

    /**
     * This function detects which browser version is running this script,
     * parsing major and minor version (e.g., 42.1). User agent strings from:
     * http://www.useragentstring.com/pages/useragentstring.php
     */
    browserVersion: function browserVersion(userAgent, vendor, opera) {
        var browser = _.info.browser(userAgent, vendor, opera);
        var versionRegexs = {
            'Internet Explorer Mobile': /rv:(\d+(\.\d+)?)/,
            'Microsoft Edge': /Edge?\/(\d+(\.\d+)?)/,
            'Chrome': /Chrome\/(\d+(\.\d+)?)/,
            'Chrome iOS': /CriOS\/(\d+(\.\d+)?)/,
            'UC Browser': /(UCBrowser|UCWEB)\/(\d+(\.\d+)?)/,
            'Safari': /Version\/(\d+(\.\d+)?)/,
            'Mobile Safari': /Version\/(\d+(\.\d+)?)/,
            'Opera': /(Opera|OPR)\/(\d+(\.\d+)?)/,
            'Firefox': /Firefox\/(\d+(\.\d+)?)/,
            'Firefox iOS': /FxiOS\/(\d+(\.\d+)?)/,
            'Konqueror': /Konqueror:(\d+(\.\d+)?)/,
            'BlackBerry': /BlackBerry (\d+(\.\d+)?)/,
            'Android Mobile': /android\s(\d+(\.\d+)?)/,
            'Samsung Internet': /SamsungBrowser\/(\d+(\.\d+)?)/,
            'Internet Explorer': /(rv:|MSIE )(\d+(\.\d+)?)/,
            'Mozilla': /rv:(\d+(\.\d+)?)/
        };
        var regex = versionRegexs[browser];
        if (regex === undefined) {
            return null;
        }
        var matches = userAgent.match(regex);
        if (!matches) {
            return null;
        }
        return parseFloat(matches[matches.length - 2]);
    },

    os: function os() {
        var a = userAgent;
        if (/Windows/i.test(a)) {
            if (/Phone/.test(a) || /WPDesktop/.test(a)) {
                return 'Windows Phone';
            }
            return 'Windows';
        } else if (/(iPhone|iPad|iPod)/.test(a)) {
            return 'iOS';
        } else if (/Android/.test(a)) {
            return 'Android';
        } else if (/(BlackBerry|PlayBook|BB10)/i.test(a)) {
            return 'BlackBerry';
        } else if (/Mac/i.test(a)) {
            return 'Mac OS X';
        } else if (/Linux/.test(a)) {
            return 'Linux';
        } else if (/CrOS/.test(a)) {
            return 'Chrome OS';
        } else {
            return '';
        }
    },

    device: function device(user_agent) {
        if (/Windows Phone/i.test(user_agent) || /WPDesktop/.test(user_agent)) {
            return 'Windows Phone';
        } else if (/iPad/.test(user_agent)) {
            return 'iPad';
        } else if (/iPod/.test(user_agent)) {
            return 'iPod Touch';
        } else if (/iPhone/.test(user_agent)) {
            return 'iPhone';
        } else if (/(BlackBerry|PlayBook|BB10)/i.test(user_agent)) {
            return 'BlackBerry';
        } else if (/Android/.test(user_agent)) {
            return 'Android';
        } else {
            return '';
        }
    },

    referringDomain: function referringDomain(referrer) {
        var split = referrer.split('/');
        if (split.length >= 3) {
            return split[2];
        }
        return '';
    },

    properties: function properties() {
        return _.extend(_.strip_empty_properties({
            '$os': _.info.os(),
            '$browser': _.info.browser(userAgent, navigator.vendor, windowOpera),
            '$referrer': document.referrer,
            '$referring_domain': _.info.referringDomain(document.referrer),
            '$device': _.info.device(userAgent)
        }), {
            '$current_url': win.location.href,
            '$browser_version': _.info.browserVersion(userAgent, navigator.vendor, windowOpera),
            '$screen_height': screen.height,
            '$screen_width': screen.width,
            'mp_lib': 'web',
            '$lib_version': _config2['default'].LIB_VERSION,
            '$insert_id': cheap_guid(),
            'time': _.timestamp() / 1000 // epoch time in seconds
        });
    },

    people_properties: function people_properties() {
        return _.extend(_.strip_empty_properties({
            '$os': _.info.os(),
            '$browser': _.info.browser(userAgent, navigator.vendor, windowOpera)
        }), {
            '$browser_version': _.info.browserVersion(userAgent, navigator.vendor, windowOpera)
        });
    },

    pageviewInfo: function pageviewInfo(page) {
        return _.strip_empty_properties({
            'mp_page': page,
            'mp_referrer': document.referrer,
            'mp_browser': _.info.browser(userAgent, navigator.vendor, windowOpera),
            'mp_platform': _.info.os()
        });
    }
};

var cheap_guid = function cheap_guid(maxlen) {
    var guid = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    return maxlen ? guid.substring(0, maxlen) : guid;
};

var quick_hash = function quick_hash(str) {
    // Bernstein's hash: http://www.cse.yorku.ca/~oz/hash.html#djb2
    var hash = 5381;
    if (str.length == 0) return hash;
    for (var i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash = hash & hash;
    }

    return hash;
};

/**
 * Check deterministically whether to include or exclude from a feature rollout/test based on the
 * given string and the desired percentage to include.
 * @param {String} str - string to run the check against (for instance a project's token)
 * @param {String} feature - name of feature (for inclusion in hash, to ensure different results
 * for different features)
 * @param {Number} percent_allowed - percentage chance that a given string will be included
 * @returns {Boolean} whether the given string should be included
 */
var determine_eligibility = _.safewrap(function (str, feature, percent_allowed) {
    str = str + feature;

    var hash = quick_hash(str);
    var dart = (hash >>> 0) % 100;
    return dart < percent_allowed;
});

// naive way to extract domain name (example.com) from full hostname (my.sub.example.com)
var SIMPLE_DOMAIN_MATCH_REGEX = /[a-z0-9][a-z0-9-]*\.[a-z]+$/i;
// this next one attempts to account for some ccSLDs, e.g. extracting oxford.ac.uk from www.oxford.ac.uk
var DOMAIN_MATCH_REGEX = /[a-z0-9][a-z0-9-]+\.[a-z.]{2,6}$/i;
/**
 * Attempts to extract main domain name from full hostname, using a few blunt heuristics. For
 * common TLDs like .com/.org that always have a simple SLD.TLD structure (example.com), we
 * simply extract the last two .-separated parts of the hostname (SIMPLE_DOMAIN_MATCH_REGEX).
 * For others, we attempt to account for short ccSLD+TLD combos (.ac.uk) with the legacy
 * DOMAIN_MATCH_REGEX (kept to maintain backwards compatibility with existing Moesif
 * integrations). The only _reliable_ way to extract domain from hostname is with an up-to-date
 * list like at https://publicsuffix.org/ so for cases that this helper fails at, the SDK
 * offers the 'cookie_domain' config option to set it explicitly.
 * @example
 * extract_domain('my.sub.example.com')
 * // 'example.com'
 */
var extract_domain = function extract_domain(hostname) {
    var domain_regex = DOMAIN_MATCH_REGEX;
    var parts = hostname.split('.');
    var tld = parts[parts.length - 1];
    if (tld.length > 4 || tld === 'com' || tld === 'org') {
        domain_regex = SIMPLE_DOMAIN_MATCH_REGEX;
    }
    var matches = hostname.match(domain_regex);
    return matches ? matches[0] : '';
};

var JSONStringify = null,
    JSONParse = null;
if (typeof JSON !== 'undefined') {
    exports.JSONStringify = JSONStringify = JSON.stringify;
    exports.JSONParse = JSONParse = JSON.parse;
}
exports.JSONStringify = JSONStringify = JSONStringify || _.JSONEncode;
exports.JSONParse = JSONParse = JSONParse || _.JSONDecode;

// EXPORTS (for closure compiler)
_['toArray'] = _.toArray;
_['isObject'] = _.isObject;
_['JSONEncode'] = _.JSONEncode;
_['JSONDecode'] = _.JSONDecode;
_['isBlockedUA'] = _.isBlockedUA;
_['isEmptyObject'] = _.isEmptyObject;
_['isEmptyString'] = _.isEmptyString;
_['info'] = _.info;
_['info']['device'] = _.info.device;
_['info']['browser'] = _.info.browser;
_['info']['browserVersion'] = _.info.browserVersion;
_['info']['properties'] = _.info.properties;

exports._ = _;
exports.userAgent = userAgent;
exports.console = console;
exports.window = win;
exports.document = document;
exports.navigator = navigator;
exports.cheap_guid = cheap_guid;
exports.quick_hash = quick_hash;
exports.console_with_prefix = console_with_prefix;
exports.determine_eligibility = determine_eligibility;
exports.extract_domain = extract_domain;
exports.localStorageSupported = localStorageSupported;
exports.JSONStringify = JSONStringify;
exports.JSONParse = JSONParse;

},{"./config":6}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _utils = require('./utils');

// eslint-disable-line

var logger = (0, _utils.console_with_prefix)('utm');

var UTMConstants = { // UTM Params
  UTM_SOURCE: 'utm_source',
  UTM_MEDIUM: 'utm_medium',
  UTM_CAMPAIGN: 'utm_campaign',
  UTM_TERM: 'utm_term',
  UTM_CONTENT: 'utm_content'
};

function getUtmData(rawCookie, query) {
  // Translate the utmz cookie format into url query string format.
  var cookie = rawCookie ? '?' + rawCookie.split('.').slice(-1)[0].replace(/\|/g, '&') : '';

  logger.log('cookie');
  logger.log(cookie);

  var fetchParam = function fetchParam(queryName, query, cookieName, cookie) {
    return _utils._.getQueryParamByName(queryName, query) || _utils._.getQueryParamByName(cookieName, cookie);
  };

  var utmSource = fetchParam(UTMConstants.UTM_SOURCE, query, 'utmcsr', cookie);
  var utmMedium = fetchParam(UTMConstants.UTM_MEDIUM, query, 'utmcmd', cookie);
  var utmCampaign = fetchParam(UTMConstants.UTM_CAMPAIGN, query, 'utmccn', cookie);
  var utmTerm = fetchParam(UTMConstants.UTM_TERM, query, 'utmctr', cookie);
  var utmContent = fetchParam(UTMConstants.UTM_CONTENT, query, 'utmcct', cookie);

  var utmData = {};
  var addIfNotNull = function addIfNotNull(key, value) {
    if (!_utils._.isEmptyString(value)) {
      utmData[key] = value;
    }
  };

  addIfNotNull(UTMConstants.UTM_SOURCE, utmSource);
  addIfNotNull(UTMConstants.UTM_MEDIUM, utmMedium);
  addIfNotNull(UTMConstants.UTM_CAMPAIGN, utmCampaign);
  addIfNotNull(UTMConstants.UTM_TERM, utmTerm);
  addIfNotNull(UTMConstants.UTM_CONTENT, utmContent);

  return utmData;
}

function getUtm(queryParams, cookieParams) {
  queryParams = _utils._.getUrlParams();
  cookieParams = _utils._.cookie.get('__utmz');
  var utmProperties = getUtmData(cookieParams, queryParams);
  return utmProperties;
}

exports.getUtm = getUtm;
exports.UTMConstants = UTMConstants;

},{"./utils":16}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _utils = require('./utils');

// eslint-disable-line

var logger = (0, _utils.console_with_prefix)('web3capture');

function computeUrl(provider) {
  if (provider && provider.host) {
    return provider.host;
  }

  return '/';
}

function createEventModel(provider, startTime, endTime, payload, result, error) {
  // JSONRPC will always be POST.
  var requestModel = {
    'uri': computeUrl(provider),
    'verb': 'POST',
    'time': startTime,
    'headers': {}
  };

  if (provider['headers']) {
    var hdrs = {};

    _utils._['each'](provider['headers'], function (item) {
      hdrs[item['name']] = item['value'];
    });

    requestModel['headers'] = hdrs;
  }

  if (payload) {
    if (typeof payload === 'string') {
      logger.log('request post data is string');
      logger.log(payload);
      try {
        requestModel['body'] = _utils._.JSONDecode(payload);
      } catch (err) {
        logger.log('JSON decode failed');
        logger.log(err);
        requestModel['transfer_encoding'] = 'base64';
        requestModel['body'] = _utils._.base64Encode(payload);
      }
    } else if (typeof payload === 'object' || Array.isArray(payload) || typeof payload === 'number' || typeof postData === 'boolean') {
      requestModel['body'] = payload;
    }
  }

  // var responseHeaders = parseResponseHeaders(this.getAllResponseHeaders());

  var responseModel = {
    'status': 200,
    // it is always 200 for JSON RPC.
    'time': endTime,
    'headers': {}
  };

  if (result) {
    // responseText is string or null
    responseModel['body'] = result;
    // if (isJsonHeader(responseHeaders) || isStartJson(this.responseText)) {
    //   responseModel['body'] = parseBody(this.responseText);
    // } else {
    //   responseModel['transfer_encoding'] = 'base64';
    //   responseModel['body'] = _.base64Encode(this.responseText);
    // }
  } else if (error) {
      responseModel['body'] = {
        'error': error
      };
    }

  var event = {
    'request': requestModel,
    'response': responseModel,
    'metadata': {
      '_web3': {
        'via_web3_provider': true,
        'path': provider['path'],
        'host': provider['host']
      }
    }
  };

  if (provider['isMetaMask']) {
    event['metadata']['_web3']['is_metamask'] = true;
  }

  return event;
}

/**
 * @param recorder
 * @returns {undoPatch}
 *
 * The recorder is a function that takes an Event and records it.
 *
 */
function captureWeb3Requests(myWeb3, recorder, options) {
  if (myWeb3['currentProvider']) {
    logger.log('found my currentProvider, patching it');
    var CPDR = myWeb3['currentProvider'];

    var send = CPDR['send'];
    var sendAsync = CPDR['sendAsync'];

    CPDR['send'] = function (payload) {
      logger.log('patched send is called');
      logger.log(payload);
      var _startTime = new Date().toISOString();
      var result = send.apply(CPDR, arguments);

      logger.log('patch send result is back');
      logger.log(result);
      var _endTime = new Date().toISOString();
      if (recorder) {
        recorder(createEventModel(CPDR, _startTime, _endTime, payload, result));
      }

      return result;
    };

    CPDR['sendAsync'] = function (payload, callback) {
      logger.log('patched sendAsync is called');
      logger.log(payload);
      var _startTime = new Date().toISOString();
      var provider = CPDR;

      var _callback = function _callback(err, result) {
        var _endTime = new Date().toISOString();

        logger.log('inside patched callback');
        logger.log(result);
        if (recorder) {
          recorder(createEventModel(provider, _startTime, _endTime, payload, result, err));
        }
        if (callback) {
          callback(err, result);
        }
      };

      sendAsync.apply(CPDR, [payload, _callback]);
    };

    var undoPatch = function undoPatch() {
      CPDR.send = send;
      CPDR.sendAsync = sendAsync;
    };
    return undoPatch;
  }
  return null;
  // so caller have a handle to undo the patch if needed.
}

exports['default'] = captureWeb3Requests;
module.exports = exports['default'];

},{"./utils":16}]},{},[1]);
