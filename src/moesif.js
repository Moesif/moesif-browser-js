/**
 * Created by Xingheng on 2/1/17.
 */

import { _, console } from './utils';
import patchAjaxWithCapture from './capture';

var MOESIF_CONSTANTS = {
  //The base Uri for API calls
  HOST: "api.moesif.net",
  EVENT_ENDPOINT: "/v1/events",
  EVENT_BATCH_ENDPOINT: "/v1/events/batch",
  STORED_USER_ID: "moesif_stored_user_id"
};

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

  // console.log('moesif object creator is called');

  var HTTP_PROTOCOL = (('https:' === document.location.protocol) ? 'https://' : 'http://');

  function sendEvent(event, token, debug, callback) {
    var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance
    xmlhttp.open("POST", HTTP_PROTOCOL + MOESIF_CONSTANTS.HOST + MOESIF_CONSTANTS.EVENT_ENDPOINT);
    xmlhttp.setRequestHeader('Content-Type', 'application/json');
    xmlhttp.setRequestHeader('X-Moesif-Application-Id', token);
    xmlhttp.setRequestHeader('X-Moesif-SDK', 'moesif-browser-js/1.1.0');
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4) {
        if (xmlhttp.status >= 200 && xmlhttp.status <= 300 ) {
          if (debug) {
            console.log('sent to moesif successfully')
          }
        } else {
          if (debug) {
            console.error(xhr.statusText);
          }
          if (callback && _.isFunction(callback)) {
            callback(new Error('can not sent to moesif'), event);
          }
        }
      }
    };
    xmlhttp.send(_.JSONEncode(event));
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
      ops.skip = options['skip'] || function () {
        return false;
      };

      ops.debug = options['debug'];
      ops.callback = options['callback'];
      ops.applicationId = options['applicationId'];
      ops.apiVersion = options['apiVersion'];

      this._options = ops;
      this._userId = localStorage.getItem(MOESIF_CONSTANTS.STORED_USER_ID);
      console.log('moesif initiated');
      return this;
    },
    'start': function () {
      var _self = this;

      function recordEvent(event) {
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

        if (!_self._options.skip(event) && isContentJson(event) && !isMoesif(event)) {
          sendEvent(logData, _self._options.applicationId, _self._options.debug, _self._options.callback)
        }
      }
      console.log('moesif starting');
      this._stopRecording = patchAjaxWithCapture(recordEvent);
    },
    'identifyUser': function (userId) {
      this._userId = userId;
      localStorage.setItem(MOESIF_CONSTANTS.STORED_USER_ID, userId);
    },
    'identifySession': function (session) {
      this._session = session;
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
    }
  }
};
