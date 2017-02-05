/**
 * Created by Xingheng on 1/31/17.
 */

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
          var event = {
            'request': {
              'uri': this._url,
              'verb': this._method,
              'time': this._startTime,
              'body': postData ? parseBody(postData) : undefined,
              'headers': this._requestHeaders
            },
            'response': {
              'status': this.status,
              'time': endTime,
              'headers': parseResponseHeaders(this.getAllResponseHeaders()),
              'body': parseBody(this.responseText)
            }
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

function parseBody(body) {
  if (!body) {
    return {};
  }
  try {
    return JSON.parse(body);
  } catch(err) {
    return {
      'moesif_error': {
        'code': 'moesif_parse_errhttps://www.budgetbytes.com/2010/09/naan/or',
        'msgs': ['Can not parse body'],
        'args': [body]
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

export default captureXMLHttpRequest;
