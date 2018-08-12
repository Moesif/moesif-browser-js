/**
 * Created by Xingheng on 1/31/17.
 */

import { _, console } from './utils';


var HTTP_PROTOCOL = (('https:' === document.location.protocol) ? 'https://' : 'http://');

function computeUrl(provider) {
  // if (!provider) {
  //   return HTTP_PROTOCOL + window.location.host + '/';
  // }

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

    _['each'](provider['headers'], function (item) {
      hdrs[item['name']] = item['value'];
    });

    requestModel['headers'] = hdrs;
  }

  if (payload) {
    if (typeof payload === 'string') {
      console.log('request post data is string');
      console.log(payload);
      try {
        requestModel['body'] = _.JSONDecode(payload);
      } catch(err) {
        console.log('JSON decode failed');
        console.log(err);
        requestModel['transfer_encoding'] = 'base64';
        requestModel['body'] = _.base64Encode(payload);
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
    console.log('found my currentProvider, patching it');
    var CPDR = myWeb3['currentProvider'];

    var send = CPDR['send'];
    var sendAsync = CPDR['sendAsync'];

    CPDR['send'] = function(payload) {
      console.log('patched send is called');
      console.log(payload);
      var _startTime = (new Date()).toISOString();
      var result = send.apply(CPDR, arguments);

      console.log('patch send result is back');
      console.log(result);
      var _endTime = (new Date()).toISOString();
      if (recorder) {
        recorder(createEventModel(CPDR, _startTime, _endTime, payload, result));
      }

      return result;
    };

    CPDR['sendAsync'] = function(payload, callback) {
      console.log('patched sendAsync is called');
      console.log(payload);
      var _startTime = (new Date()).toISOString();
      var provider = CPDR;

      var _callback = function(err, result) {
        var _endTime = (new Date()).toISOString();

        console.log('inside patched callback');
        console.log(result);
        if (recorder) {
          console.log('about to record event');
          recorder(createEventModel(provider, _startTime, _endTime, payload, result, err));
        }

        console.log('triggering original callback');

        callback(err, result);
      };

      console.log(payload);
      sendAsync.apply(CPDR, [payload, _callback]);
    };

    var undoPatch = function () {
      CPDR.send = send;
      CPDR.sendAsync = sendAsync;
    };
    return undoPatch;
  }
  return null;
  // so caller have a handle to undo the patch if needed.
}

export default captureWeb3Requests;
