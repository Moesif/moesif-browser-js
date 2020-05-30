/**
 * Created by Xingheng on 1/31/17.
 */

import { _, console_with_prefix } from './utils'; // eslint-disable-line camelcase
import { attemptParseBuffer, attemptParseText } from './parsers';

var logger = console_with_prefix('capture');

var HTTP_PROTOCOL = (('http:' === (document && document.location.protocol)) ? 'http://' : 'https://');

function handleRequestFinished(xhrInstance, postData, recorder) {
  logger.log('processResponse for' + xhrInstance._url);
  var endTime = (new Date()).toISOString();

  if (recorder) {
    // avoid apiRequest.io and moesif.com
    var myUrl = xhrInstance._url ? xhrInstance._url.toLowerCase() : xhrInstance._url;
    if(myUrl && myUrl.indexOf('moesif.com') < 0 && myUrl.indexOf('apirequest.io') < 0) {

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

          var parseResult = attemptParseText(postData);
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
        parsedBody = attemptParseText(rawText);
        responseModel['body'] = parsedBody['body'];
        responseModel['transfer_encoding'] = parsedBody['transfer_encoding'];
      } else if (xhrInstance.response) {
        // if there is no responseText, but response exists, we'll try process it.
        logger.log('no responseText trying with xhr.response');
        if (xhrInstance.responseType === 'json') {
          logger.log('responseType is json. then directly assign');
          responseModel['body'] = xhrInstance.response;
        } else if (_.isString(xhrInstance.response)) {
          logger.log('response is string. attempt to parse');
          parsedBody = attemptParseText(xhrInstance.response);
          responseModel['body'] = parsedBody['body'];
          responseModel['transfer_encoding'] = parsedBody['transfer_encoding'];
        } else if (xhrInstance.responseType === 'arraybuffer') {
          logger.log('responseType is buffer. attempt to parse');
          parsedBody = attemptParseBuffer(xhrInstance.response);
          responseModel['body'] = parsedBody['body'];
          responseModel['transfer_encoding'] = parsedBody['transfer_encoding'];
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
    if(headers['content-type'] && headers['content-type'].indexOf('json') >= 0) {
      return true;
    }
    if(headers['Content-Type'] && headers['Content-Type'].indexOf('json') >= 0) {
      return true;
    }
  }
  return false;
}

function isStartJson(body) {
  if(body && typeof body === 'string') {
    var trimmedBody = _.trim(body);
    if (trimmedBody.indexOf('[') === 0 || trimmedBody.indexOf('{') === 0 ) {
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
  var headerPairs = headerStr.split('\u000d\u000a');
  for (var i = 0; i < headerPairs.length; i++) {
    var headerPair = headerPairs[i];
    var index = headerPair.indexOf('\u003a\u0020');
    if (index > 0) {
      var key = headerPair.substring(0, index);
      headers[key] = headerPair.substring(index + 2);
    }
  }
  return headers;
}

function convertToFullUrl(url) {
  if (url && typeof url === 'string') {
    var trimedUrl = _.trim(url);
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
  XHR.open = function(method, url) {
    logger.log('XHR open triggered');
    this._method = method;
    this._url = url;
    this._requestHeaders = {};
    this._startTime = (new Date()).toISOString();
    return open.apply(this, arguments);
  };

  XHR.setRequestHeader =  function(header, value) {
    this._requestHeaders[header] = value;
    return setRequestHeader.apply(this, arguments);
  };

  XHR.send = function(postData) {
    logger.log('XHR send started for ' + this._url);

    var _self = this;

    // in case of eagerBodyLogging, we'll
    // patch onreadystatechange which is more of
    // replacement or if addEventListener does not exist.
    if (shouldPatchOnReadyState || !this.addEventListener) {
      var _onreadystatechange = this.onreadystatechange;
      this.onreadystatechange = function() {
        var readyState = _self.readyState;
        logger.log('readyState ' + readyState);
        if (readyState === XMLHttpRequest.DONE) {
          logger.log('XHR onreadystatechange DONE triggered for ' + _self._url);
          handleRequestFinished(_self, postData, recorder);
        }

        if (_onreadystatechange && _.isFunction(_onreadystatechange)) {
          logger.log('trigger old onreadystatechange');
          return _onreadystatechange.apply(this, arguments);
        }
      };
    } else {
      // this only adds another listener.
      this.addEventListener('loadend', function() {
        logger.log('XHR loadend triggered for ' + _self._url);
        handleRequestFinished(_self, postData, recorder);
      });
    }

    return send.apply(this, arguments);
  };

  var undoPatch = function () {
    XHR.open = open;
    XHR.send = send;
    XHR.setRequestHeader = setRequestHeader;
  };

  // so caller have a handle to undo the patch if needed.
  return undoPatch;
}

export default captureXMLHttpRequest;
