import config from './config';
import { _, console } from './utils';

var STORAGE_CONSTANTS = {
  STORED_USER_ID: 'moesif_stored_user_id',
  STORED_COMPANY_ID: 'moesif_stored_company_id',
  STORED_SESSION_ID: 'moesif_stored_session_id',
  STORED_ANONYMOUS_ID: 'moesif_anonymous_id',
  STORED_CAMPAIGN_DATA_USER: 'moesif_campaign_data',
  STORED_CAMPAIGN_DATA_COMPANY: 'moesif_campaign_company',
  STORED_PENDING_REQUESTS: 'moesif_pending_requests'
};

function replacePrefix(key, prefix) {
  if (!prefix) return key;
  if (key.indexOf('moesif_') === 0) {
    return key.replace('moesif_', prefix);
  }
  return key;
}

function getPersistenceFunction(opt) {
  var storageType = opt['persistence'];
  if (storageType !== 'cookie' && storageType !== 'localStorage') {
    console.critical('Unknown persistence type ' + storageType + '; falling back to cookie');
    storageType = config['persistence'] = 'localStorage';
  }
  var prefix = opt['persistence_key_prefix'];

  // we default to localStorage unless cookie is specificied.
  var setFunction = function (key, value) {
     var resolvedKey = replacePrefix(key, prefix);
     _.localStorage.set(resolvedKey, value);
     // if localStorage and by default, we'll try to set the cookie too.
     _.cookie.set(
       resolvedKey,
       value,
       opt['cookie_expiration'],
       opt['cross_subdomain_cookie'],
       opt['secure_cookie'],
       opt['cross_site_cookie'],
       opt['cookie_domain']
      );
  };

  if (storageType === 'cookie' || !_.localStorage.is_supported()) {
    setFunction = function(key, value) {
      var resolvedKey = replacePrefix(key, prefix);
      _.cookie.set(
        resolvedKey,
        value,
        opt['cookie_expiration'],
        opt['cross_subdomain_cookie'],
        opt['secure_cookie'],
        opt['cross_site_cookie'],
        opt['cookie_domain']
      );
    };
  }

  if (storageType === 'none') {
    setFunction = function () {};
  }

  return setFunction;
}

function ensureNotNilString(str) {
  // this is sometimes localStorage saves null and undefined
  // as string null and undefined
  if (str === 'null' || str === 'undefined' || str === '') {
    return null;
  }
  return str;
}

// Helper to check if localStorage should be used based on user's persistence preference
function shouldUseLocalStorage(opt) {
  var storageType = opt && opt['persistence'];
  return storageType !== 'cookie' && _.localStorage.is_supported();
}

// Helper to get resolved storage key with prefix
function getResolvedKey(key, opt) {
  var prefix = opt && opt['persistence_key_prefix'];
  return replacePrefix(key, prefix);
}

// this tries to get from either cookie or localStorage.
// whichever have data.
function getFromPersistence(key, opt) {
  var storageType = opt && opt['persistence'];
  var resolvedKey = getResolvedKey(key, opt);
  if (_.localStorage.is_supported()) {
    var localValue = ensureNotNilString(_.localStorage.get(resolvedKey));
    var cookieValue = ensureNotNilString(_.cookie.get(resolvedKey));
    // if there is value in cookie but not in localStorage
    // but persistence type if localStorage, try to re-save in localStorage.
    if (!localValue && cookieValue && storageType === 'localStorage') {
      _.localStorage.set(resolvedKey, cookieValue);
    }
    return localValue || cookieValue;
  }
  return ensureNotNilString(_.cookie.get(resolvedKey));
}

function clearCookies(opt) {
  _.cookie.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_USER_ID, opt));
  _.cookie.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_COMPANY_ID, opt));
  _.cookie.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_ANONYMOUS_ID, opt));
  _.cookie.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_SESSION_ID, opt));
  _.cookie.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA_USER, opt));
  _.cookie.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA_COMPANY, opt));
}

function clearLocalStorage(opt) {
  _.localStorage.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_USER_ID, opt));
  _.localStorage.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_COMPANY_ID, opt));
  _.localStorage.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_ANONYMOUS_ID, opt));
  _.localStorage.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_SESSION_ID, opt));
  _.localStorage.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA_USER, opt));
  _.localStorage.remove(getResolvedKey(STORAGE_CONSTANTS.STORED_CAMPAIGN_DATA_COMPANY, opt));
}

// LocalStorage-only helpers for page-specific data (e.g., pending requests queue)
// These do NOT sync to cookies and are not meant for cross-subdomain data
// Respects user's persistence preference - if they opted for 'cookie' mode, localStorage is not used
function getFromLocalStorageOnly(key, opt) {
  if (!shouldUseLocalStorage(opt)) {
    return null;
  }
  return ensureNotNilString(_.localStorage.get(getResolvedKey(key, opt)));
}

function saveToLocalStorageOnly(key, value, opt) {
  if (!shouldUseLocalStorage(opt)) {
    return false;
  }
  _.localStorage.set(getResolvedKey(key, opt), value);
  return true;
}

function removeFromLocalStorageOnly(key, opt) {
  if (!shouldUseLocalStorage(opt)) {
    return false;
  }
  _.localStorage.remove(getResolvedKey(key, opt));
  return true;
}

export {
  getFromPersistence,
  getPersistenceFunction,
  STORAGE_CONSTANTS,
  clearCookies,
  clearLocalStorage,
  getFromLocalStorageOnly,
  saveToLocalStorageOnly,
  removeFromLocalStorageOnly
};
