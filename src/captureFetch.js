import { _, console } from './utils';

/**
 * @param {*} buffer
 * this checks the buffer and
 * returns something to start building the response or request model
 * with body filled in.
 */
function processBodyAndInitializedModel(buffer) {
  if (!buffer) return {};
  console.log('about to decode buffer');
  console.log(buffer);
  console.log(buffer.byteLength);

  if (buffer.byteLength <= 0) {
    // empty body.
    return {};
  }

  try {
    var decoder = new TextDecoder('utf-8');
    var text = decoder.decode(buffer);

    try {
      return { 'body': _.JSONDecode(text) };
    } catch (err) {
      console.error(err);
      return {
        'transfer_encoding': 'base64',
        'body': _.base64Encode(text)
      };
    }
  } catch (err) {
    console.error(err);
    console.log(buffer);
    return {
      'transfer_encoding': 'base64',
      'body': 'can not be decoded'
    };
  }
}

/**
 *
 * @param {*} headers
 * headers must be a Headers object.
 */
function parseHeaders(headers) {
  var result = {};
  console.log('parseheaders is called');

  var entries = headers.entries();

  var entry = entries.next();
  while (!entry.done) {
    console.log(entry.value); // 1 3 5 7 9
    result[entry.value[0]] = entry.value[1];

    entry = entries.next();
  }

  // for (var pair of headers.entries()) {
  //   result[pair[0]] = pair[1];
  // }

  return result;
}

function processSavedRequestResponse(savedRequest, savedResponse, startTime, endTime, recorder) {
  try {
    setTimeout(function() {
      console.log('interception is here.');
      console.log(savedRequest);
      console.log(savedResponse);
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
        console.log('inside if statement.');
        try {
          Promise.all([savedRequest.arrayBuffer(), savedResponse.arrayBuffer()]).then(function(
            bodies
          ) {
            console.log('processing bodies');
            var processedBodies = bodies.map(processBodyAndInitializedModel);

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

            console.log(requestModel);
            console.log(responseModel);

            var event = {
              'request': requestModel,
              'response': responseModel
            };

            recorder(event);
          });
        } catch (err) {
          console.log('error processing body');
        }
      } else {
        console.log('savedRequest');
      }
    }, 50);
  } catch (err) {
    console.error('error processing saved fetch request and response, but move on anyways.');
    console.log(err);
  }
}

function interceptor(recorder, fetch, arg1, arg2) {
  console.log('fetch interceptor is called');

  var savedRequest = null;

  try {
    savedRequest = new Request(arg1, arg2);
  } catch (err) {
    // for internal errors only.
  }
  var startTime = new Date().toISOString();
  var endTime = null;

  var promise = null;
  // promise = Promise.resolve([arg1, arg2]);

  // reigster the fetch call.
  // promise = promise.then(function(ar1, ar2) {
  //   return fetch(ar1, ar2);
  // });

  console.log('about to perform fetch.');
  promise = fetch(arg1, arg2);

  var savedResponse = null;
  // add handlers for response.
  promise = promise.then(function(response) {
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
    console.log('found fetch method.');
    if (!myenv['fetch']['polyfill']) {
      // basically, if it is polyfill, it means
      // that it is using XMLhttpRequest underneath,
      // then no need to patch fetch.
      var oldFetch = myenv['fetch'];

      console.log('fetch is not polyfilled so instrumenting it');

      myenv['fetch'] = (function(fetch) {
        return function(arg1, arg2) {
          return interceptor(recorder, fetch, arg1, arg2);
        };
      })(myenv['fetch']);

      var unpatch = function() {
        myenv['fetch'] = oldFetch;
      };

      return unpatch;
    } else {
      // should not patch if it is polyfilled.
      // since it would duplicate the data.
      console.log('skip patching fetch since it is polyfilled');
      return null;
    }
  } else {
    console.log('there is no fetch found');
  }
}

export default patch;
