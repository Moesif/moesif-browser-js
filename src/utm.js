
import { _, console } from './utils';

var Constants = {  // UTM Params
  UTM_SOURCE: 'utm_source',
  UTM_MEDIUM: 'utm_medium',
  UTM_CAMPAIGN: 'utm_campaign',
  UTM_TERM: 'utm_term',
  UTM_CONTENT: 'utm_content'
};

function _getUrlParams() {
  return location && location.search;
}

function getUtmData(rawCookie, query) {
  // Translate the utmz cookie format into url query string format.
  var cookie = rawCookie ? '?' + rawCookie.split('.').slice(-1)[0].replace(/\|/g, '&') : '';

  console.log('cookie');
  console.log(cookie);

  var fetchParam = function fetchParam(queryName, query, cookieName, cookie) {
    return _.getQueryParamByName(queryName, query) ||
           _.getQueryParamByName(cookieName, cookie);
  };

  var utmSource = fetchParam(Constants.UTM_SOURCE, query, 'utmcsr', cookie);
  var utmMedium = fetchParam(Constants.UTM_MEDIUM, query, 'utmcmd', cookie);
  var utmCampaign = fetchParam(Constants.UTM_CAMPAIGN, query, 'utmccn', cookie);
  var utmTerm = fetchParam(Constants.UTM_TERM, query, 'utmctr', cookie);
  var utmContent = fetchParam(Constants.UTM_CONTENT, query, 'utmcct', cookie);

  var utmData = {};
  var addIfNotNull = function addIfNotNull(key, value) {
    if (!_.isEmptyString(value)) {
      utmData[key] = value;
    }
  };

  addIfNotNull(Constants.UTM_SOURCE, utmSource);
  addIfNotNull(Constants.UTM_MEDIUM, utmMedium);
  addIfNotNull(Constants.UTM_CAMPAIGN, utmCampaign);
  addIfNotNull(Constants.UTM_TERM, utmTerm);
  addIfNotNull(Constants.UTM_CONTENT, utmContent);

  return utmData;
}

function getUtm(queryParams, cookieParams) {
  queryParams = _getUrlParams();
  cookieParams = _.cookie.get('__utmz');
  var utmProperties = getUtmData(cookieParams, queryParams);
  return utmProperties;
}

export default getUtm;
