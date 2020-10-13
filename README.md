# Moesif JavaScript Browser SDK

[![NPM](https://nodei.co/npm/moesif-browser-js.png?compact=true&stars=true)](https://nodei.co/npm/moesif-browser-js/)

[![Built For][ico-built-for]][link-built-for]
[![Total Downloads][ico-downloads]][link-downloads]
[![Software License][ico-license]][link-license]
[![Source Code][ico-source]][link-source]

The Moesif browser SDK enables you to store customer demographics and their actions within [Moesif's](https://www.moesif.com) API analytics service.
You can install the SDK on your web portal, blog, and developer docs to deeply understand how customers adopt and use your platform.

_If you provide an API, this SDK can be used alongside a [Moesif server agent](https://www.moesif.com/implementation) to monitor API traffic. Moesif 
will automatically stitch together what a user did on your website and how they used your APIs for a cross-platform funnel analysis and a deep understanding of 
how customers adopt your APIs._ 

The SDK automatically collects useful context from a user's device including any marketing attribution, device type, and location information and stores in the user and/or company profile in Moesif. You can add additional customer properties such as user email and company domain via the `identifyUser()` and `identifyCompany()` methods.

If you want to automatically log AJAX API calls, you can also call the `start()` method. API logging has native support for RESTful, GraphQL, Ethereum Web3, JSON-RPC, and other APIs

[Source Code on GitHub](https://github.com/moesif/moesif-browser-js)

## How to install

_This SDK is designed to run in a browser. To monitor Node.js APIs, use [moesif-nodejs](https://www.moesif.com/docs/server-integration/nodejs/)._

### Installation via script tag

```html
<script src="//unpkg.com/moesif-browser-js@^1/moesif.min.js"></script>
<script type="text/javascript">
  // Initialize the SDK. Must be called before any other methods
  moesif.init({
    applicationId: "Your Moesif Application Id",
    // add other option here
  });

  // Identify the user with Moesif such as when user logs in
  moesif.identifyUser("12345");

  // Log user actions like clicked sign up. You can also pass in custom metadata. 
  moesif.track("clicked_sign_up", {
    button_label: "Get Started",
  });
</script>
```

Put the above script tags in between the `<head>` tags of your HTML page.
It will attach a global `moesif` object. You can access it either via `moesif` or `window.moesif`.

### Alternative installation via NPM

The SDK is also available on [NPM](https://www.npmjs.com/package/moesif-browser-js) which can be used if you're using
a front-end packager like [Browserify](http://browserify.org/) or [Webpack](https://webpack.github.io/):

```sh
npm install --save moesif-browser-js
```

You can then require the lib like a standard NPM module:

```javascript
var moesif = require("moesif-browser-js");

// Initialize the SDK. Must be called before any other methods
moesif.init({
  applicationId: "Your Moesif Application Id",
  // add other option here
});

// Identify the user with Moesif such as when user logs in
moesif.identifyUser("12345");

// Log UI actions like clicked sign up
moesif.track("clicked_sign_up", {
  button_label: "Get Started",
});
```

With the `require` method, the `moesif` object is not attached to any global scope, but you can attach to the global window object easily:

```javascript
window.moesif = moesif;
```

Your Moesif Application Id will be displayed during the onboarding steps when signing up for [Moesif](https://www.moesif.com/) You can always find your Moesif Application Id at any time by logging
into the [_Moesif Portal_](https://www.moesif.com/), go to top right menu,
and then clicking _Installation_.

## How to use

### Track user actions

Actions are something that a user (or company) performed on your website such as "Clicked Sign Up", "Viewed Documentation", or "Purchased a Plan".
Besides the action name, you can also save related metadata properties such as the "Sign Up Method" or "Button Label".

```javascript
// The first argument is required and contains the action name as a string.
// The second argument is optional and contains custom event metadata such as button label.
moesif.track('Clicked Sign Up', {
  button_label: 'Get Started',
  sign_up_method: 'Google SSO'
});
```

Moesif recommends starting with the following actions: "Viewed Landing", "Viewed Docs", "Account Created", "Signed Up", "Signed In", "Invite Sent", "Started Onboarding", "Finished Onboarding", "Trial Started", and "Trial Ended".

### Identifying users

When you know the user's id such as after sign in, call `identifyUser`.
This tells Moesif who the current user is so their actions can be linked to a user profile. 

Besides the userId, you can also save related properties such as user demographics and subscription information.

```javascript
moesif.identifyUser("12345", {
  email: "john@acmeinc.com",
  firstName: "John",
  lastName: "Doe",
  title: "Software Engineer",
  salesInfo: {
    stage: "Customer",
    lifetimeValue: 24000,
    accountOwner: "mary@contoso.com",
  },
});
```

Moesif recommends aginst calling `identifyUser` for anonymous users. Moesif will track these users automatically. 
The recommended place to call `identifyUser` is after the user logs in and you know their real user id. 

### Identifying companies

In addition to identifying users, you can also identify the company for account level tracking. Besides the companyId, you can also save related properties such as company demographics and website domain.

```javascript
// Only the first argument is a string containing the company id. This is the only required field.
// The second argument is a object used to store a company info like plan, MRR, and company demographics.
// The third argument is a string containing company website or email domain. If set, Moesif will enrich your profiles with publicly available info.
metadata = {
  orgName: "Acme, Inc",
  planName: "Free Plan",
  dealStage: "Lead",
  mrr: 24000,
  demographics: {
    alexaRanking: 500000,
    employeeCount: 47,
  },
};

moesif.identifyCompany("67890", metadata, "acmeinc.com");
```
__If you call both identifyUser() and identifyCompany() in the same session, then Moesif will automatically associate the user with the company.__

### Track AJAX calls
If you want to automatically log AJAX API calls, you can do so via the `start` function.

```javascript
// Start capturing AJAX API Calls.
moesif.start();
```

## Anonymous Ids

When moesif-browser-js is initialized, an anonymousId is generated and stored in localStorage (or cookie) depending on persistence availability and settingss.
This enables events to be attributed to the same user. Once you call `identifyUser`, Moesif will automatically merge the 
anonymousId with the real userId. 

**Do not call `identifyUser` unless you know the real user id such as when a user logged in.**

## List of Methods on the `moesif` Object

#### init, (obj) => null

Initialize the SDK with your Application Id and any other options.
On initialization, the SDK will capture user context like device and marketing attribution.
This method must be called before any other methods like `start()` or `identifyUser`.

```javascript
var options = {
  applicationId: 'Your Moesif Application Id'
};

moesif.init(options);

```

#### identifyUser, (string, object) => null

When a user logs into your website and you have their actual user id, identify the user with your userId.
You can also add custom metadata containing fields like the customer's name and email as the second argument.

Note: You shouldn't call `identifyUser` for anonymous visitors to your website. 
Moesif automatically assigns them an anonymousId, so just calling track works just fine without identify.

When you call identifyUser, Moesif automatically merges the anonymousId with your real userId. 

```javascript
moesif.identifyUser("12345", metadata);
```

#### identifyCompany, (string, object, string) => null

Similar to `identifyUser`, but for tracking companies (accounts) which is recommended for B2B companies.
You can use both `identifyUser` and `identifyCompany` or just one. If you call both identifyUser() and identifyCompany() in the same session, then Moesif will automatically associate the user with the company.

Only the first argument is a string containing the company id. This is the only required field.
The second argument is a object used to store a company info like plan, MRR, and company demographics.
The third argument is a string containing company website or email domain. If set, Moesif will enrich your profiles with publicly available info.

```javascript
moesif.identifyCompany("67890", metadata, "acmeinc.com");
```

#### track, (string, object) => null

Track user actions such as "clicked sign up" or "made a purchase". By tracking user actions in addition to API usage via one of the [Moesif server SDKs](https://www.moesif.com/implementation), you'll be able to understand the entire customer journey from inital sign up to first API call. First argument is an action name as a string, which is required. Second parameter is an optional metadata object related to this action event. [See API Reference](https://www.moesif.com/docs/api#track-a-user-action)

```javascript
moesif.track('clicked_sign_up', {
  button_label: 'Get Started'
});
```

#### identifySession, (string) => null

The Moesif SDK tracks browser sessions automatically and saves in a Cookie. You can override with a specific session token.

The new session token will continue to be used until `identifySession` is called again.

```javascript
moesif.identifySession("d23xdefc3ijhcv93hf4h38f90h43f");
```

#### reset, () => null

Clears any saved userId, companyId, including any device context stored in localStorage or cookies.
You should call reset on logout which will also regenerate a new anonymousId. 

```javascript
moesif.reset()
```

#### start, () => null

In addition to tracking user actions, the SDK can also log outgoing API calls. 
When you call `start()`, the SDK will log AJAX API calls, including:

- Your own APIs (such as an API powering your Single Page App)
- 3rd party APIs (such as to Stripe and Twilio)
- Decentralized APIs such as DApps communicating with Ethereum Web3/interactions with smart contracts

```javascript
moesif.start()
```

#### stop, () => null

Stops logging AJAX API calls. It is not required to call this, since recording will stop automatically when the browser tab is closed.
However, you can call `stop` directly if you want more control. Call `start` again to restart API logging.

```javascript
moesif.stop()
```

#### useWeb3, (web3) => boolean

Sets the web3 JSON-RPC to use the web3 object passed in. If no argument is passed
in, it will try to restart capturing using the global `web3` object. Return `true` if successful.

```javascript
moesif.useWeb3(myWeb3Object);
```

## Configuration options

The `options` is an object that is passed into the SDK's `init` method.

#### applicationId - string, required

This is the collector API key that is obtained from your Moesif account. Collector Application Id's are write-only keys and can be safely used on the client side.

#### batchEnabled, boolean, optional, default false.

Will start batching the tracking of API Events and User Actions to sent to Moesif. The identifyUser and identifyCompanies are not batched.

#### batchSize, number, optional, default 25

Even if set, the batchSize is used on a best effort basis. If the payloads sizes get too big, the batchSize maybe auto adjusted.

#### batchMaxTime, number in milliseconds, optional, default 2500

The maximum interval to flush the queue when the batch size have not been reached.

#### eagerBodyLogging, boolean, optional, default false

Some complex frameworks like Angular monkey patch to intercept the response body. If you are an Angular user or find that the response is not being captured, turn this option on to eagerly capture the response info.

#### persistence, string, optional, default localStorage

By default, `localStorage` is set. The allowed values are `localStorage`, `cookie`, and `none`.

When set to `localStorage `, session and attribution tracking is stored in localStorage, with fallback to cookie.
When set to `cookie`, session and attribution tracking is stored in cookies only, which can enable cross domain tracking.
When set to `none`, nothing will be persisted. Not recommended except for advanced use cases as refreshing the browser tab will create a new user session.

When set to `cookie`, the following additional options can be set.

- crossSiteCookie, boolean, optional, default false,
- crossSubdomainCookie, boolean, optional, default true,
- cookieExpiration, number, optional, default 365
- secureCookie, boolean, optional, default false,
- cookieDomain, string, optional, default ''

#### disableFetch, boolean, optional, default false.

Starting from version 1.4.0, this SDK also instruments fetch API if it is not polyfilled.
Some browsers may use fetch under XmlHTTPRequest, then it is possible events get duplicated. In this case, disable fetch will fix the issue.

#### skip, (event) => boolean, optional

Optional function that to determine on if a particular event should be skipped logging.
The parameter passed in is an event model. [See event model](https://www.moesif.com/docs/api#log-an-api-call).

#### maskContent, (event) => event, optional

Optional function that let you mask any sensitive data in the event model, and then return
the masked event. Important that do not remove required fields in the event model. See the spec
on the event model to see what is required.

#### getMetadata, (event) => object, optional

Optional function that allow you to append arbitrary JSON metadata to API calls before being logged to Moesif.

full options example:

```javascript
var options = {
  applicationId: "Your Moesif Application Id",
  skip: function (event) {
    if (event.request.uri.includes("google")) {
      return true;
    }
    return false;
  },
  maskContent: function (event) {
    if (event.request.headers["secret"]) {
      event.request.headers["secret"] = "";
    }
    return event;
  },
  getMetadata: function (event) {
    if (event.request.uri.includes("stripe")) {
      return {
        type: "payment",
      };
    }
  },
};

moesif.init(options);
```

## Ethereum DApp support

DApps (Decentralized Apps) are frontend apps which interact with blockchains such as Ethereum over an API like any other Single Page App. For Ethereum, this API layer uses JSON-RPC and is called the [Ethereum Web3 API](https://github.com/ethereum/web3.js) which Moesif supports natively.

Moesif will capture interactions with the Ethereum blockchain just like any other API to understand usage and monitor for any issues affecting your Dapp. Because this data is binary, there are additional set up steps needed to convert these API interactions into something human readable. [Checkout Moesif's Ethereum Web3 documentation for more info](https://www.moesif.com/docs/platform/ethereum-web3/).

There is also a tutorial available on [Building an Ethereum DApp with Integrated Web3 Monitoring](https://www.moesif.com/blog/blockchain/ethereum/Tutorial-for-building-Ethereum-Dapp-with-Integrated-Error-Monitoring/).

### Web3 object

Many Dapp clients such as the [Metamask](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en) extension and [Mist Browser](https://github.com/ethereum/mist), will inject a `web3` object directly in the browser's global scope.

The default `moesif-browser-js` config will automatically instrument the injected web3 object and capture outgoing API transactions to the Ethereum network.

For advanced scenarios where your code uses a different `web3` object than the default one, you can call `moesif.useWeb3(myWeb3)` to ensure the correct web3 instance is instrumented.

The web3 object can change if you let users modify the selected web3 provider or change their network. An example is below:

```javascript
if (typeof web3 !== "undefined") {
  myWeb3 = new Web3(web3.currentProvider);
  // No action needed by Moesif
} else {
  // set the custom provider you want from Web3.providers
  myWeb3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

  moesif.useWeb3(myWeb3);
}
```

## Troubleshooting

### Response not being logged
Certain frameworks like Angular monkey patch the XMLHttpRequest heavily. In these cases, enable the eagerBodyLogging option to eagerly capture the response info.

### Duplicate API events

By default, `moesif-browser-js` captures both outgoing API calls from `XMLHttpRequest` and the `web3` object.
This way you can see both blockchain related transactions along with other 3rd party APIs like Twilio or Stripe.

If the Web3 provider is also using the XMLHttpRequest (such as the HttpProvider), it's possible that the same API call is captured twice.
This is expected.

`moesif-browser-js` adds metadata depending on the captured source. For events that are captured via `web3`, we add additional [event metadata](https://www.moesif.com/docs/getting-started/api-events/#custom-metadata) for the web3 provider used.

As an example:

```json
{
  "_web3": {
    "via_web3_provider": true,
    "is_metamask": true
  }
}
```

## Examples

- Several examples for how to import this library are in the example folder of this repo, _moesif-min_ folder have more examples usage.
- Example setup for [react-boilerplate](https://github.com/Moesif/moesif-react-boilerplate-example). For React apps, if you set up server-side rendering, please ensure that this library is only initiated on the client-side.
- Example setup for an [Etherum Dapp](https://github.com/Moesif/moesif-ethereum-js-example).

## Credits for moesif-browser-js

Some of the build scripts, utilities, and directory structure is based on Mixpanel's Javascript Client Library,
which is under Apache 2.0 license.

Some utilities are based on underscore.

To modify and build this library, please see instructions in Build.md

## Other integrations

To view more more documentation on integration options, please visit **[the Integration Options Documentation](https://www.moesif.com/docs/getting-started/integration-options/).**

[ico-built-for]: https://img.shields.io/badge/built%20for-javascript-blue.svg
[ico-downloads]: https://img.shields.io/npm/dt/moesif-browser-js.svg
[ico-license]: https://img.shields.io/badge/License-Apache%202.0-green.svg
[ico-source]: https://img.shields.io/github/last-commit/moesif/moesif-browser-js.svg?style=social
[link-built-for]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[link-downloads]: https://www.npmjs.com/package/moesif-browser-js
[link-license]: https://raw.githubusercontent.com/Moesif/moesif-browser-js/master/LICENSE
[link-source]: https://github.com/moesif/moesif-browser-js
