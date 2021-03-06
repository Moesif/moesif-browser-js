import { _, console_with_prefix } from './utils'; // eslint-disable-line
import getReferrer from './referrer';
import { getUtm, UTMConstants } from './utm';
import { getFromPersistence, STORAGE_CONSTANTS } from './persistence';

var logger = console_with_prefix('campaign');

function getGclid(urlParams) {
  var gclid = _.getQueryParamByName('gclid', urlParams);
  if (_.isEmptyString(gclid)) {
    return;
  }
  return gclid;
}

function getCampaignDataFromUrlOrCookie(opt) {
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
      var gclid = getGclid(_.getUrlParams());
      if (gclid) {
        result['gclid'] = gclid;
      }
    }

    return result;
  } catch (err) {
    logger.log(err);
  }
}

function mergeCampaignData(saved, current) {
  if (!current) {
    return saved;
  }

  if (!saved) {
    return current;
  }

  var result = _.extend({}, saved, current);

  // if utm source exists.
  // every field of UTM will be override to be
  // consistent.
  if (current && current[UTMConstants.UTM_SOURCE]) {
    for (var prop in UTMConstants) {
      result[UTMConstants[prop]] = current[UTMConstants[prop]];
    }
  }

  return result;
}

function getCampaignData(persist, opt) {
  var storedCampaignData = null;
  var storedCampaignString = null;
  try {
    storedCampaignString = getFromPersistence(STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA, opt);
    if (storedCampaignString && storedCampaignString !== 'null') {
      storedCampaignData = _.JSONDecode(storedCampaignString);
    }
  } catch (err) {
    logger.error('failed to decode campaign data ' + storedCampaignString);
    logger.error(err);
  }
  var currentCampaignData = getCampaignDataFromUrlOrCookie(opt);
  logger.log('current campaignData');
  logger.log(_.JSONEncode(currentCampaignData));

  var merged = mergeCampaignData(storedCampaignData, currentCampaignData);
  logger.log('merged campaignData');
  logger.log(_.JSONEncode(merged));

  try {
    if (persist && merged && merged !== 'null') {
      persist(STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA, _.JSONEncode(merged));
    }
  } catch (err) {
    logger.error('failed to persist campaign data');
    logger.error(err);
  }

  return merged;
}

export default getCampaignData;
