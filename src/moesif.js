/**
 * Created by Xingheng on 2/1/17.
 */

import { _, console } from './utils';
import patchAjaxWithCapture from './capture';
import patchWeb3WithCapture from './web3capture';
import patchFetchWithCapture from './captureFetch';
import Config from './config';

var MOESIF_CONSTANTS = {
  //The base Uri for API calls
  HOST: 'api.moesif.net',
  EVENT_ENDPOINT: '/v1/events',
  USER_ENDPOINT: '/v1/users',
  EVENT_BATCH_ENDPOINT: '/v1/events/batch',
  STORED_USER_ID: 'moesif_stored_user_id',
  STORED_SESSION_ID: 'moesif_stored_session_id'
};

var HTTP_PROTOCOL = (('https:' === document.location.protocol) ? 'https://' : 'http://');

// http://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
// https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#withCredentials
// var USE_XHR = (window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest());

// IE<10 does not support cross-origin XHR's but script tags
// with defer won't block window.onload; ENQUEUE_REQUESTS
// should only be true for Opera<12

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
  return event['request']['headers']['X-Moesif-SDK'];
}

function ensureValidOptions(options) {
  if (!options) throw new Error('options are required by moesif-express middleware');
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

  function sendEvent(event, token, debug, callback) {
    console.log('actually sending to log event ' + _.JSONEncode(event) );
    var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance
    xmlhttp.open('POST', HTTP_PROTOCOL + MOESIF_CONSTANTS.HOST + MOESIF_CONSTANTS.EVENT_ENDPOINT);
    xmlhttp.setRequestHeader('Content-Type', 'application/json');
    xmlhttp.setRequestHeader('X-Moesif-Application-Id', token);
    xmlhttp.setRequestHeader('X-Moesif-SDK', 'moesif-browser-js/' + Config.LIB_VERSION);
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4) {
        if (xmlhttp.status >= 200 && xmlhttp.status <= 300 ) {
          if (debug) {
            console.log('sent to moesif successfully: ' + event['request']['uri']);
          }
        } else {
          console.log('failed to sent to moesif: '  + event['request']['uri']);
          if (debug) {
            console.error(xmlhttp.statusText);
          }
          if (callback && _.isFunction(callback)) {
            callback(new Error('can not sent to moesif'), event);
          }
        }
      }
    };
    xmlhttp.send(_.JSONEncode(event));
  }

  function updateUser(userProfile, token, debug, callback) {
    var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance
    xmlhttp.open('POST', HTTP_PROTOCOL + MOESIF_CONSTANTS.HOST + MOESIF_CONSTANTS.USER_ENDPOINT);
    xmlhttp.setRequestHeader('Content-Type', 'application/json');
    xmlhttp.setRequestHeader('X-Moesif-Application-Id', token);
    xmlhttp.setRequestHeader('X-Moesif-SDK', 'moesif-browser-js/' + Config.LIB_VERSION);
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4) {
        if (xmlhttp.status >= 200 && xmlhttp.status <= 300 ) {
          if (debug) {
            console.log('update user to moesif successfully: ' + userProfile['user_id']);
          }
        } else {
          console.log('update user to moesif failed ' + userProfile['user_id']);
          if (debug) {
            console.error(xmlhttp.statusText);
          }
          if (callback && _.isFunction(callback)) {
            callback(new Error('can not update user to moesif'), null, userProfile);
          }
        }
      }
    };
    xmlhttp.send(_.JSONEncode(userProfile));
  }

  return {
    'init': function (options) {

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

      this._options = ops;
      this._userId = localStorage.getItem(MOESIF_CONSTANTS.STORED_USER_ID);
      this._session = localStorage.getItem(MOESIF_CONSTANTS.STORED_SESSION_ID);
      console.log('moesif initiated');
      return this;
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
      this._stopRecording = patchAjaxWithCapture(recorder);

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
      return false;
    },
    'identifyUser': function (userId, metadata) {
      this._userId = userId;
      if (!(this._options && this._options.applicationId)) {
        throw new Error('Init needs to be called with a valid application Id before calling identify User.');
      }
      if(metadata) {
        var userObject = {
          'user_id': userId,
          'session_token': this._session,
          'metadata': metadata
        };
        updateUser(userObject, this._options.applicationId, this._options.debug, this._options.callback);
      }
      localStorage.setItem(MOESIF_CONSTANTS.STORED_USER_ID, userId);
    },
    'identifySession': function (session) {
      this._session = session;
      localStorage.setItem(MOESIF_CONSTANTS.STORED_SESSION_ID, session);
    },
    recordEvent: function(event) {
      var _self = this;
      console.log('determining if should log: ' + event['request']['uri']);
      var logData = Object.assign({}, event);
      if (_self._getUserId()) {
        logData['user_id'] = _self._getUserId();
      }
      if (_self._getSession()) {
        logData['session_token'] = _self._getSession();
      }

      logData['tags'] = _self._options.getTags(event) || '';

      if (_self._options.apiVersion) {
        logData['request']['api_version'] = _self._options.apiVersion;
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
        sendEvent(logData, _self._options.applicationId, _self._options.debug, _self._options.callback);
      } else {
        console.log('skipped logging for ' + event['request']['uri']);
      }
    },
    _getUserId: function () {
      return this._userId;
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
    }
  };
}
