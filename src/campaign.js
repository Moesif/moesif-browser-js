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

// since identify company can happen a lot later
// than initial anonymous users
// persist the very initial campaign data for
// companies until company is identified.
// function getStoredInitialCampaignData(opt) {
//   var storedCampaignData = null;
//   var storedCampaignString = null;
//   try {
//     storedCampaignString = getFromPersistence(
//       STORAGE_CONSTANTS.STORED_INITIAL_CAMPAIGN_DATA,
//       opt
//     );
//     if (storedCampaignString) {
//       storedCampaignData = _.JSONDecode(storedCampaignString);
//     }
//   } catch (err) {
//     logger.error(
//       'failed to decode company campaign data ' + storedCampaignString
//     );
//     logger.error(err);
//   }

//   return storedCampaignData;
// }

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

function hasData(data) {
  if (data && !_.isEmptyObject(data)) {
    return true;
  }
  return false;
}

function saveEncodeIfHasData(persist, storageKey, data) {
  try {
    if (hasData(data)) {
      var dataString = _.JSONEncode(data);
      persist(storageKey, dataString);
    }
  } catch (err) {
    logger.error('failed to decode campaign data');
    logger.error(err);
  }
}

function getAndDecode(storageKey, opt) {
  try {
    const stringVal = getFromPersistence(storageKey, opt);
    if (stringVal && stringVal !== 'null') {
       const data = _.JSONDecode(stringVal);
       if (hasData(data)) {
         return data;
       }
       return null;
    }
  } catch (err) {
    logger.error('failed to persist campaign data');
    logger.error(err);
    return null;
  }
}

function storeForOneEntityIfNotSavedYet(
  persist,
  opt,
  entityStorageKey,
  currentCampaignData
) {
  const storedData = getAndDecode(entityStorageKey, opt);
  if (!storedData && persist) {
    saveEncodeIfHasData(persist, entityStorageKey, currentCampaignData);
  }
}

// this stores Campaign data if not saved yet.
function storeCampaignDataIfNeeded(persist, opt, currentCampaignData) {
  storeForOneEntityIfNotSavedYet(persist, opt, STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA_USER, currentCampaignData);
  storeForOneEntityIfNotSavedYet(persist, opt, STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA_COMPANY, currentCampaignData);
}

function popStoredCampaignData(persist, opt, storageKey) {
  const storedCampaignData = getAndDecode(storageKey, opt);

  if (storedCampaignData) {
    // let's delete it
    // we know we will use it.
    // so next one can overridee
    try {
      persist(storageKey, '');
    } catch (err) {
      logger.error('failed to clear campaign data');
    }
    return storedCampaignData;
  }
  return null;
}

function popStoredCampaignDataForUser(persist, opt) {
  return popStoredCampaignData(persist, opt, STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA_USER);
}

function popStoredCampaignDataForCompany(persist, opt) {
  return popStoredCampaignData(persist, opt, STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA_COMPANY);
}

// function getCampaignData(persist, opt) {
//   var storedCampaignData = null;
//   var storedCampaignString = null;
//   try {
//     storedCampaignString = getFromPersistence(
//       STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA,
//       opt
//     );
//     if (storedCampaignString && storedCampaignString !== 'null') {
//       storedCampaignData = _.JSONDecode(storedCampaignString);
//     }
//   } catch (err) {
//     logger.error('failed to decode campaign data ' + storedCampaignString);
//     logger.error(err);
//   }

//   var currentCampaignData = getCampaignDataFromUrlOrCookie(opt);
//   logger.log('current campaignData');
//   logger.log(_.JSONEncode(currentCampaignData));

//   var merged = mergeCampaignData(storedCampaignData, currentCampaignData);
//   logger.log('merged campaignData');
//   logger.log(_.JSONEncode(merged));

//   try {
//     if (persist && merged && !_.isEmptyObject(merged)) {
//       var mergedString = _.JSONEncode(merged);
//       persist(STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA, mergedString);

//       // UTM_SOURCE exists means that merged campaign info have data.
//       if (!storedCampaignData && merged[UTMConstants.UTM_SOURCE]) {
//         // first time we persist campaign data, and thus persis the initial data until identifyCompany is called
//         persist(STORAGE_CONSTANTS.STORED_INITIAL_CAMPAIGN_DATA, mergedString);
//       }
//     }
//   } catch (err) {
//     logger.error('failed to persist campaign data');
//     logger.error(err);
//   }

//   return merged;
// }

export {
  getCampaignDataFromUrlOrCookie,
  storeCampaignDataIfNeeded,
  popStoredCampaignDataForUser,
  popStoredCampaignDataForCompany
};
