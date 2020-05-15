import { _ } from './utils';

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

  if (_.isEmptyString(referrer)) {
    return;
  }

  var referrerInfo = {
    'referrer': referrer,
    'referring_domain': _getReferringDomain(referrer)
  };

  return referrerInfo;
}

export default getReferrer;
