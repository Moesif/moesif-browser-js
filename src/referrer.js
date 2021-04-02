import { _, console_with_prefix } from './utils'; // eslint-disable-line

var logger = console_with_prefix('referrer');

function _getReferrerStr() {
  return document && document.referrer;
}

function _getReferringDomain(referrer) {
  if (_.isEmptyString(referrer)) {
    return null;
  }
  var parts = referrer.split('/');
  if (parts.length >= 3) {
    return parts[2];
  }
  return null;
}

function getReferrer() {
  var referrer = _getReferrerStr();

  logger.log(referrer);

  if (_.isEmptyString(referrer)) {
    return;
  }

  if (referrer.indexOf(location.protocol + '//' + location.host) === 0) {
    logger.log('referrer is the same so skipping');
    return;
  }

  var referrerInfo = {
    'referrer': referrer,
    'referring_domain': _getReferringDomain(referrer)
  };

  return referrerInfo;
}

export default getReferrer;
