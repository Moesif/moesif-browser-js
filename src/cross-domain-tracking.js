import { _ } from './utils';

function executeWithMiddleware(context, finalAction, middleware) {
  // If no middleware, just run the core logic
  if (typeof middleware !== 'function') {
    return finalAction();
  }

  middleware(context, finalAction);
}

function isTargetDomain(urlObj, decoratableDomains) {
  if (decoratableDomains === null) return true; // Decorate all domains if decoratableDomains is null
  if (Array.isArray(decoratableDomains) && decoratableDomains.length === 0) return false;
  return decoratableDomains.some(function(domain) {
    var target = domain.toLowerCase();
    var current = urlObj.hostname.toLowerCase();
    return current === target || current.indexOf('.' + target, current.length - ('.' + target).length) !== -1;
  });
}

function isSameOrigin(urlObj, env) {
  var myenv = env || window || self;
  try {
    return urlObj.origin === myenv.location.origin;
  } catch (e) {
    // Fallback for older browsers
    return urlObj.hostname === myenv.location.hostname &&
           urlObj.protocol === myenv.location.protocol &&
           urlObj.port === myenv.location.port;
  }
}

function decorator(url, decoratableDomains, trackingParam, trackingValue, env) {
  if (!url) return url; // Added check for empty/undefined URLs
  try {
    var urlObj = new URL(url, window.location.origin);

    // Skip same-origin links to avoid unnecessary overhead and exposure
    if (isSameOrigin(urlObj, env)) {
      return url;
    }

    // Check if the hostname of the URL matches any of the decoratable domains
    var isTarget = isTargetDomain(urlObj, decoratableDomains);

    if (isTarget) {
      urlObj.searchParams.set(trackingParam, trackingValue);
      return urlObj.href;
    }
  } catch (e) {
    return url;
  }
  return url;
}

export default function decorateLinks(trackingDomains, trackingParamName, trackingParamValue, middleware, env) {
  var myenv = env || window || self;

  // Link click handler - handles various click events
  var linkClickHandler = function(e) {
    function next() {
      var link = e.target.closest('a');
      if (link && link.href) {
        link.href = decorator(link.href, trackingDomains, trackingParamName, trackingParamValue, myenv);
      }
    }
    var contextForMiddleware = {
      event: e,
      trackingDomains: trackingDomains,
      trackingParamName: trackingParamName,
      trackingParamValue: trackingParamValue,
      env: myenv
    };
    executeWithMiddleware(contextForMiddleware, next, middleware);
  };

  // Form submission handler
  var formSubmitHandler = function(e) {
    function next() {
      var form = e.target;
      try {
        var actionUrl = new URL(form.action, myenv.location.origin);

        // Skip same-origin forms
        if (isSameOrigin(actionUrl, myenv)) {
          return;
        }

        var isTarget = isTargetDomain(actionUrl, trackingDomains);

        if (isTarget) {
          var method = (form.method || 'get').toLowerCase();

          // Only decorate GET forms automatically
          // POST forms are skipped to avoid breaking server-side logic (CSRF, routing, etc.)
          // POST body can't be read by JavaScript on the destination page anyway
          // Users can manually use cdtUrlDecorator() for form.action if needed
          if (method === 'get') {
            // Add as hidden input which will be appended to the query string
            var trackingInput = form.querySelector('input[name="' + trackingParamName + '"]');

            if (!trackingInput) {
              trackingInput = myenv.document.createElement('input');
              trackingInput.type = 'hidden';
              trackingInput.name = trackingParamName;
              form.appendChild(trackingInput);
            }

            trackingInput.value = trackingParamValue;
          }
        }
      } catch (err) {
        // skip decoration
      }
    }

    var contextForMiddleware = {
      event: e,
      trackingDomains: trackingDomains,
      trackingParamName: trackingParamName,
      trackingParamValue: trackingParamValue,
      env: myenv
    };
    executeWithMiddleware(contextForMiddleware, next, middleware);
  };

  // Add event listeners for various interaction types
  // regular clicks
  myenv.addEventListener('mousedown', linkClickHandler, true);
  // keyboard navigation (Tab + Enter)
  myenv.addEventListener('click', linkClickHandler, true);
  // middle-click and other auxiliary button clicks
  myenv.addEventListener('auxclick', linkClickHandler, true);
  // right-click (for copy link address)
  myenv.addEventListener('contextmenu', linkClickHandler, true);
  // touch events for mobile devices
  myenv.addEventListener('touchstart', linkClickHandler, true);

  // Form submissions
  myenv.addEventListener('submit', formSubmitHandler, true);

  // Return cleanup function to remove event listeners
  return function cleanup() {
    myenv.removeEventListener('mousedown', linkClickHandler, true);
    myenv.removeEventListener('click', linkClickHandler, true);
    myenv.removeEventListener('auxclick', linkClickHandler, true);
    myenv.removeEventListener('contextmenu', linkClickHandler, true);
    myenv.removeEventListener('touchstart', linkClickHandler, true);
    myenv.removeEventListener('submit', formSubmitHandler, true);
  };
}

function getCrossDomainTrackingParamValue(paramName) {
  try {
    if (!window || !window.location || !window.location.search) {
      return null;
    }
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(paramName);
  } catch (err) {
    // URLSearchParams might not be available in older browsers
    // or window.location might not be accessible
    return null;
  }
}

// Remove the tracking parameter from the URL to prevent pollution
// Call this after the parameter has been read and persisted
function cleanUrlParameter(paramName) {
  try {
    if (!window || !window.location || !window.history || !window.history.replaceState) {
      console.log('Browser does not support URL manipulation APIs, cannot clean URL parameter');
      return; // Browser doesn't support history API
    }

    var urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has(paramName)) {
      console.log('URL parameter not present, nothing to clean');
      return; // Parameter not present, nothing to clean
    }

    // Remove the parameter
    urlParams['delete'](paramName); // 'delete' is a reserved keyword, so we use bracket notation

    // reconsruct the new URL
    var newSearch = urlParams.toString();
    var newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;

    // Replace the URL without reloading the page
    window.history.replaceState(null, '', newUrl);
  } catch (err) {
    console.log('Error cleaning URL parameter: ' + err.message);
    // Silently fail - URL cleaning is not critical
  }
}

_.crossDomainTrackingUtils = {
  getCrossDomainTrackingParamValue: getCrossDomainTrackingParamValue,
  cleanUrlParameter: cleanUrlParameter,
  cdtUrlDecorator: decorator
};
