import { _, console_with_prefix } from './utils'; // eslint-disable-line camelcase

var logger = console_with_prefix('parsers');

var attemptParseText = function(text) {
  try {
    return { 'body': _.JSONDecode(text) };
  } catch(err) {
    logger.log('JSON decode failed');
    logger.log(err);
    return {
      'transfer_encoding': 'base64',  // eslint-disable-line camelcase
      'body': _.base64Encode(text)
    };
  }
};

/**
 * @param {*} buffer
 * this checks the buffer and
 * returns something to start building the response or request model
 * with body filled in.
 */
var attemptParseBuffer = function (buffer) {
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
      return { 'body': _.JSONDecode(text) };
    } catch (err) {
      logger.error(err);
      return {
        'transfer_encoding': 'base64',
        'body': _.base64Encode(text)
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


export { attemptParseBuffer, attemptParseText };
