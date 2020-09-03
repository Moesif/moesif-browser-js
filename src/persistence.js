import config from './config';
import { _, console } from './utils';

var STORAGE_CONSTANTS = {
  STORED_USER_ID: 'moesif_stored_user_id',
  STORED_COMPANY_ID: 'moesif_stored_company_id',
  STORED_SESSION_ID: 'moesif_stored_session_id',
  STORED_ANONYMOUS_ID: 'moesif_anonymous_id',
  STORED_CAMPAIGN_DATA: 'moesif_campaign_data'
};

function getPersistenceFunction(opt) {
  var storageType = opt['storage_type'];
  if (storageType !== 'cookie' && storageType !== 'localStorage') {
    console.critical('Unknown persistence type ' + storageType + '; falling back to cookie');
    storageType = config['persistence'] = 'localStorage';
  }

  // we default to localStorage unless cookie is specificied.
  var setFunction = function (key, value) {
     _.localStorage.set(key, value);
  };

  if (storageType === 'cookie' || !_.localStorage.is_supported()) {
    setFunction = function(key, value) {
      _.cookie.set(
        key,
        value,
        opt['cookie_expiration'],
        opt['cross_domain_cookie'],
        opt['secure_cookie'],
        opt['cross_site_cookie'],
        opt['cookie_domain']
      );
    };
  }

  return setFunction;
}

// this tries to get from either cookie or localStorage.
// whichever have data.
function getFromPersistence(key) {
  if (_.localStorage.is_supported()) {
    return _.localStorage.get(key) || _.cookie.get(key);
  }
  return _.cookie.get(key);
}

function clearCookies() {
  _.cookie.remove(STORAGE_CONSTANTS.STORED_USER_ID);
  _.cookie.remove(STORAGE_CONSTANTS.STORED_COMPANY_ID);
  _.cookie.remove(STORAGE_CONSTANTS.STORED_ANONYMOUS_ID);
  _.cookie.remove(STORAGE_CONSTANTS.STORED_SESSION_ID);
  _.cookie.remove(STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA);
}

export { getFromPersistence, getPersistenceFunction, STORAGE_CONSTANTS, clearCookies };
