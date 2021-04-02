import { _, console_with_prefix  } from './utils'; // eslint-disable-line

var logger = console_with_prefix('utm');

var UTMConstants = {  // UTM Params
  UTM_SOURCE: 'utm_source',
  UTM_MEDIUM: 'utm_medium',
  UTM_CAMPAIGN: 'utm_campaign',
  UTM_TERM: 'utm_term',
  UTM_CONTENT: 'utm_content'
};

function getUtmData(rawCookie, query) {
  // Translate the utmz cookie format into url query string format.
  var cookie = rawCookie ? '?' + rawCookie.split('.').slice(-1)[0].replace(/\|/g, '&') : '';

  logger.log('cookie');
  logger.log(cookie);

  var fetchParam = function fetchParam(queryName, query, cookieName, cookie) {
    return _.getQueryParamByName(queryName, query) ||
           _.getQueryParamByName(cookieName, cookie);
  };

  var utmSource = fetchParam(UTMConstants.UTM_SOURCE, query, 'utmcsr', cookie);
  var utmMedium = fetchParam(UTMConstants.UTM_MEDIUM, query, 'utmcmd', cookie);
  var utmCampaign = fetchParam(UTMConstants.UTM_CAMPAIGN, query, 'utmccn', cookie);
  var utmTerm = fetchParam(UTMConstants.UTM_TERM, query, 'utmctr', cookie);
  var utmContent = fetchParam(UTMConstants.UTM_CONTENT, query, 'utmcct', cookie);

  var utmData = {};
  var addIfNotNull = function addIfNotNull(key, value) {
    if (!_.isEmptyString(value)) {
      utmData[key] = value;
    }
  };

  addIfNotNull(UTMConstants.UTM_SOURCE, utmSource);
  addIfNotNull(UTMConstants.UTM_MEDIUM, utmMedium);
  addIfNotNull(UTMConstants.UTM_CAMPAIGN, utmCampaign);
  addIfNotNull(UTMConstants.UTM_TERM, utmTerm);
  addIfNotNull(UTMConstants.UTM_CONTENT, utmContent);

  return utmData;
}

function getUtm(queryParams, cookieParams) {
  queryParams = _.getUrlParams();
  cookieParams = _.cookie.get('__utmz');
  var utmProperties = getUtmData(cookieParams, queryParams);
  return utmProperties;
}

export { getUtm, UTMConstants };
