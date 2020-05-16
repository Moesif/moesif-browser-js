import { _, console_with_prefix } from './utils'; // eslint-disable-line
import getReferrer from './referrer';
import getUtm from './utm';

var logger = console_with_prefix('campaign');

function _getUrlParams() {
  return location && location.search;
}

function getGclid(urlParams) {
  var gclid = _.getQueryParamByName('gclid', urlParams);
  if (_.isEmptyString(gclid)) {
    return;
  }
  return gclid;
}

function getCampaignData(opt) {
  try {
    var result = {};

    if (!opt.disableUtm) {
      result = getUtm() || {};
    }

    if (!opt.disableReferer) {
      var referrer = getReferrer();
      if (referrer) {
        result['referrer'] = referrer['referrer'];
        result['referring_domain'] = referrer['referring_domain'];
      }
    }
    if (!opt.disableRGclid) {
      var gclid = getGclid(_getUrlParams());
      if (gclid) {
        result['gclid'] = gclid;
      }
    }

    return result;
  } catch (err) {
    logger.log(err);
  }
}

export default getCampaignData;
