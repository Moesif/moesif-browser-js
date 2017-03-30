/**
 * Created by Xingheng on 1/31/17.
 */

import { _, console } from './utils';


var HTTP_PROTOCOL = (('https:' === document.location.protocol) ? 'https://' : 'http://');

/**
 * @param recorder
 * @returns {undoPatch}
 *
 * The recorder is a function that takes an Event and records it.
 *
 */
function captureXMLHttpRequest(recorder) {
  var XHR = XMLHttpRequest.prototype;

  var open = XHR.open;
  var send = XHR.send;
  var setRequestHeader = XHR.setRequestHeader;

  // Collect data:
  XHR.open = function(method, url) {
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
    this.addEventListener('load', function() {
      var endTime = (new Date()).toISOString();

      if (recorder) {
        // avoid apiRequest.io and moesif.com
        var myUrl = this._url ? this._url.toLowerCase() : this._url;
        if(myUrl && myUrl.indexOf('moesif.com') < 0 && myUrl.indexOf('apirequest.io') < 0) {

          var requestModel = {
            'uri': convertToFullUrl(this._url),
            'verb': this._method,
            'time': this._startTime,
            'headers': this._requestHeaders
          };

          if (postData) {
            if (typeof postData === 'string') {
              console.log('request post data is string');
              console.log(postData);
              try {
                requestModel['body'] = _.JSONDecode(postData);
              } catch(err) {
                console.log('JSON decode failed');
                console.log(err);
                requestModel['transfer_encoding'] = 'base64';
                requestModel['body'] = _.base64Encode(postData);
              }
            } else if (typeof postData === 'object' || typeof postData === 'array' || typeof postData === 'number' || typeof postData === 'boolean') {
              requestModel['body'] = postData;
            }
          }

          var responseHeaders = parseResponseHeaders(this.getAllResponseHeaders());

          var responseModel = {
            'status': this.status,
            'time': endTime,
            'headers': responseHeaders
          };

          if (this.responseText) {
            // responseText is string or null
            try {
              responseModel['body'] = _.JSONDecode(this.responseText);
            } catch(err) {
              responseModel['transfer_encoding'] = 'base64';
              responseModel['body'] = _.base64Encode(this.responseText);
            }

            // if (isJsonHeader(responseHeaders) || isStartJson(this.responseText)) {
            //   responseModel['body'] = parseBody(this.responseText);
            // } else {
            //   responseModel['transfer_encoding'] = 'base64';
            //   responseModel['body'] = _.base64Encode(this.responseText);
            // }
          }

          var event = {
            'request': requestModel,
            'response': responseModel
          };

          recorder(event);
        }
      }
    });
    return send.apply(this, arguments);
  };

  var undoPatch = function () {
    XHR.open = open;
    XHR.send = send;
    XHR.setRequestHeader = setRequestHeader;
  };

  return undoPatch;
  // so caller have a handle to undo the patch if needed.
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

function parseBody(body) {
  try {
    return _.JSONDecode(body);
  } catch(err) {
    return {
      'moesif_error': {
        'code': 'moesif_parse_err',
        'msg': 'Can not parse body',
        'src': 'moesif-browser-js',
        'args': body
      }
    }
  }
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
      return HTTP_PROTOCOL + window.location.host + url;
    } else {
      return url;
    }
  }
  return url;
}

export default captureXMLHttpRequest;
