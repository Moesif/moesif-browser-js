import { _, console_with_prefix } from './utils'; // eslint-disable-line camelcase
import { attemptParseBuffer } from './parsers';

var logger = console_with_prefix('capture fetch');

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
    setTimeout(function() {
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
          Promise.all([savedRequest.arrayBuffer(), savedResponse.arrayBuffer()]).then(function(
            bodies
          ) {
            // attemptParseBuffer will return either {}, { body }, or { body, transfer_enconding }
            var processedBodies = bodies.map(attemptParseBuffer);

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
    logger.log('found fetch method.');
    if (!myenv['fetch']['polyfill']) {
      // basically, if it is polyfill, it means
      // that it is using XMLhttpRequest underneath,
      // then no need to patch fetch.
      var oldFetch = myenv['fetch'];

      logger.log('fetch is not polyfilled so instrumenting it');

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
      logger.log('skip patching fetch since it is polyfilled');
      return null;
    }
  } else {
    logger.log('there is no fetch found, so skipping instrumentation.');
  }
}

export default patch;
