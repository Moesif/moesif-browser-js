import { RequestQueue } from './request-queue';
import { console_with_prefix, _, JSONStringify } from './utils'; // eslint-disable-line camelcase

// maximum interval between request retries after exponential backoff
var MAX_RETRY_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
var MAX_REMOVE_FAILURE = 5;

var logger = console_with_prefix('batch');

/**
 * RequestBatcher: manages the queueing, flushing, retry etc of requests of one
 * type (events, people, groups).
 * Uses RequestQueue to manage the backing store.
 * @constructor
 */
var RequestBatcher = function(storageKey, endpoint, options) {
    var storageExpiration = options.libConfig['batch_storage_expiration'];
    this.queue = new RequestQueue(storageKey, { storage: options.storage, storageExpiration: storageExpiration });
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
RequestBatcher.prototype.enqueue = function(item, cb) {
    this.queue.enqueue(item, this.flushInterval, cb);
};

/**
 * Start flushing batches at the configured time interval. Must call
 * this method upon SDK init in order to send anything over the network.
 */
RequestBatcher.prototype.start = function() {
    this.stopped = false;
    this.removalFailures = 0;
    this.flush();
};

/**
 * Stop flushing batches. Can be restarted by calling start().
 */
RequestBatcher.prototype.stop = function() {
    this.stopped = true;
    if (this.timeoutID) {
        clearTimeout(this.timeoutID);
        this.timeoutID = null;
    }
};

/**
 * Clear out queue.
 */
RequestBatcher.prototype.clear = function() {
    this.queue.clear();
};

/**
 * Restore batch size configuration to whatever is set in the main SDK.
 */
RequestBatcher.prototype.resetBatchSize = function() {
    this.batchSize = this.libConfig['batch_size'];
};

/**
 * Restore flush interval time configuration to whatever is set in the main SDK.
 */
RequestBatcher.prototype.resetFlush = function() {
    this.scheduleFlush(this.libConfig['batch_flush_interval_ms']);
};

/**
 * Schedule the next flush in the given number of milliseconds.
 */
RequestBatcher.prototype.scheduleFlush = function(flushMS) {
    this.flushInterval = flushMS;
    if (!this.stopped) { // don't schedule anymore if batching has been stopped
        this.timeoutID = setTimeout(_.bind(this.flush, this), this.flushInterval);
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
RequestBatcher.prototype.flush = function(options) {
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
        var dataForRequest = _.map(batch, function(item) { return item['payload']; });
        var batchSendCallback = _.bind(function(res) {
            this.requestInProgress = false;

            try {
                // handle API response in a try-catch to make sure we can reset the
                // flush operation if something goes wrong

                var removeItemsFromQueue = false;
                if (
                    _.isObject(res) &&
                    res.error === 'timeout' &&
                    new Date().getTime() - startTime >= timeoutMS
                ) {
                    logger.error('Network timeout; retrying');
                    this.flush();
                } else if (
                    _.isObject(res) &&
                    res.xhr_req &&
                    (res.xhr_req['status'] >= 500 || res.xhr_req['status'] <= 0)
                ) {
                    // network or API error, retry
                    var retryMS = this.flushInterval * 2;
                    var headers = res.xhr_req['responseHeaders'];
                    if (headers) {
                        var retryAfter = headers['Retry-After'];
                        if (retryAfter) {
                            retryMS = (parseInt(retryAfter, 10) * 1000) || retryMS;
                        }
                    }
                    retryMS = Math.min(MAX_RETRY_INTERVAL_MS, retryMS);
                    logger.error('Error; retry in ' + retryMS + ' ms');
                    this.scheduleFlush(retryMS);
                } else if (_.isObject(res) && res.xhr_req && res.xhr_req['status'] === 413) {
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
                  this.queue.removeItemsByID(
                    _.map(batch, function (item) {
                      return item['id'];
                    }),
                    _.bind(function (success) {
                      if (success) {
                        this.removalFailures = 0;
                        this.flush();
                      } else {
                        this.removalFailures = this.removalFailures + 1;
                        logger.error(
                          'failed to remove items from batched queue ' +
                            this.removalFailures +
                            ' times.'
                        );
                        if (this.removalFailures > MAX_REMOVE_FAILURE) {
                          logger.error(
                            'stop batching because too m any errors remove from storage'
                          );
                          this.stopAllBatching();
                        } else {
                          this.resetFlush();
                        }
                      }
                    }, this) // handle next batch if the queue isn't empty
                  );
                }
            } catch(err) {
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

    } catch(err) {
        logger.error('Error flushing request queue', err);
        this.resetFlush();
    }
};

export { RequestBatcher };
