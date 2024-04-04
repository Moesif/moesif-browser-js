# Moesif JavaScript Browser SDK

[![NPM](https://nodei.co/npm/moesif-browser-js.png?compact=true&stars=true)](https://nodei.co/npm/moesif-browser-js/)

[![Built For][ico-built-for]][link-built-for]
[![Total Downloads][ico-downloads]][link-downloads]
[![Software License][ico-license]][link-license]
[![Source Code][ico-source]][link-source]

The Moesif browser SDK enables you to identify users and track their website behavior to understand user journeys across your website and APIs together. This SDK also captures device context like geo location, browser version, marketing channel attribution, and UTM parameters.

> You can use this client SDK alongside a [Moesif server integration](https://www.moesif.com/implementation) to monitor server-side API traffic. This enables you to track your end-to-end customer journey and build cross-platform funnel reports like your _initial sign up_ to _first API call_ conversion rate.

![Diagram of Moesif API monitoring and Browser JS architecture](https://www.moesif.com/docs/images/docs/client-integration/moesif-arch-browser-js.png)

The SDK automatically collects useful context from a user's device including any marketing attribution, device type, and location information and stores in the user and/or company profile in Moesif. You can add additional customer properties such as user email and company domain via the `identifyUser()` and `identifyCompany()` methods.

If you want to automatically log AJAX API calls, you can also call the `start()` method. API logging has native support for RESTful, GraphQL, Ethereum Web3, JSON-RPC, and other APIs

[Source Code on GitHub](https://github.com/moesif/moesif-browser-js)

## How to install

> This SDK is designed to run in a browser. To monitor Node.js APIs, use [moesif-nodejs](https://www.moesif.com/docs/server-integration/nodejs/).

### Installation via script tag

```html
<script src="//unpkg.com/moesif-browser-js@v1/moesif.min.js"></script>
<script type="text/javascript">
  // Initialize the SDK. Must be called before any other methods
  moesif.init({
    applicationId: "Your Publishable Moesif Application Id",
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
// or using the import syntax
// import moesif from "moesif-browser-js";

// Initialize the SDK. Must be called before any other methods
moesif.init({
  applicationId: "Your PUblishable Moesif Application Id",
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


Your Publishable Moesif Application Id will be displayed during the onboarding steps when signing up for [Moesif](https://www.moesif.com/) when you select Browser JS. You can always find your Publishable Moesif Application Id at any time by logging
into the [_Moesif Portal_](https://www.moesif.com/), go to the main menu,
and then clicking _Installation_.

> You should only use your __publishable__ application id in untrusted apps like client-side javascript. This can be found by logging into Moesif and clicking API Keys from the bottom left menu.

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

Moesif recommends against calling `identifyUser` for anonymous users. Moesif will track these users automatically.
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

> If you call both identifyUser() and identifyCompany() in the same session, then Moesif will automatically associate the user with the company.

### Track AJAX calls
If you want to automatically log AJAX API calls, you can do so via the `start` function.

```javascript
// Start capturing AJAX API Calls.
moesif.start();
```

## Anonymous Ids

When moesif-browser-js is initialized, an `anonymousId` is generated and stored for each new visitor.
This enables you to create funnel reports of anonymous visitors even before they have signed in

Once a user signs into your app, you should call `identifyUser`.
Moesif will automatically merge any previous user activity to the real userId, even if it's a new device.

> You should call `moesif.reset()` when a user logs out of your application to ensure a new anonymousId is generated. Otherwise, new activity may get associated with an old user session.

**You should only call `identifyUser` once a user logs into your app. Do not call `identifyUser` for anonymous visitors.**

By default, Moesif uses both local storage and cookies for redundancy, but you can modify this behavior with the `persistence` options

## List of Methods on the `moesif` Object

#### init, (obj) => null

Initialize the SDK with your Publishable Application Id and any other options.
On initialization, the SDK will capture user context like device and marketing attribution.
This method must be called before any other methods like `start()` or `identifyUser`.

```javascript
var options = {
  applicationId: 'Your Publishable Moesif Application Id'
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

Clears any saved userId, companyId, and any other device context like anonymousId.
You must call `reset()` when a user logs out of your web app which will force the SDK to generate a new anonymousId.
This ensures a new anonymous id is generated and ensuring different sessions are not mixed up.

This is especially important for testing if you are logging into multiple accounts from the same device.

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

This is the collector API key that is obtained from your Moesif account. You should only use your publishable application id in untrusted apps like client-side javascript. Publishable Collector Application Id’s are write-only keys and can be safely used on the client side.

#### batchEnabled, boolean, optional, default false.

Will start batching the tracking of API Events and User Actions to sent to Moesif. The identifyUser and identifyCompanies are not batched.

#### batchSize, number, optional, default 25

Even if set, the batchSize is used on a best effort basis. If the payloads sizes get too big, the batchSize maybe auto adjusted.

#### batchMaxTime, number in milliseconds, optional, default 2500

The maximum interval to flush the queue when the batch size have not been reached.

#### eagerBodyLogging, boolean, optional, default false

Some complex frameworks like Angular monkey patch to intercept the response body. If you are an Angular user or find that the response is not being captured, turn this option on to eagerly capture the response info.

#### persistence, string, optional, default localStorage

The allowed values are `localStorage`, `cookie`, and `none`.

Moesif saves session info like anonymous ids and identified ids to a device's storage to accurately track returning visitors even if they haven't signed in.

* When set to `localStorage` (the default setting), will write session info to localStorage and then replicate to a cookie for redundancy.
This ensures that if the user clears local storage or visits a different subdomain (like from `docs.acmeinc.com` to `acmeinc.com`), there is still
a cookie to fall back to and the user can be accurately attributed. This setting is recommended for most applications.

* When set to `cookie`, session info and anonymous ids is persisted to cookies only. No local storage is used.

* When set to `none`, nothing will be persisted. Not recommended except for advanced use cases or testing. Refreshing the browser tab will create a new user session.

Keep in mind if a user clears both their cookies and their local storage, then a new `anonymousId` will be generated,
As long as you called `identifyUser` before the data was cleared, Moesif will still merge the two sessions.

#### crossSiteCookie, boolean, optional, default false,

This enables [cross-site requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite) by adding `SameSite=None; Secure` to the cookie.
This is used for special situation such as if your application is embedded in an iframe.

> When enabled, `secureCookie` is forced to true due to modern browser requirements.

#### crossSubdomainCookie, boolean, optional, default true,
When true, the cookie domain will also allow all subdomains of your hostname. This is usually recommended to track anonymous users across multiple
properties like `https://www.acmeinc.com` vs `https://docs.acmeinc.com`.

#### cookieExpiration, number, optional, default 365
Set the cookie expiration in days. By default this is 365 days.

#### secureCookie, boolean, optional, default false,
If set to true, the cookie can only be read on `https://` websites.

#### cookieDomain, string, optional, default ''
To override the domain of the cookie, you can set this such as to `*.acmeinc.com`

#### persistenceKeyPrefix, string, optional, default moesif_
The keys used for saving into local storage and cookies start with `moesif_`. You can override the prefix such as if you're running multiple instances of `moesif-browser-js`.

#### disableFetch, boolean, optional, default false.

Starting from version 1.4.0, this SDK also instruments fetch API if it is not polyfilled.
Some browsers may use fetch under `XmlHTTPRequest`, then it is possible events get duplicated. In this case, disable fetch will fix the issue.

#### skip, (event) => boolean, optional

A function hook that will skip logging the event to Moesif if returns true.
The parameter passed in is an event model. [See event model](https://www.moesif.com/docs/api#log-an-api-call).

_High volume APIs can reduce cost tremendously by leveraging [dynamic sampling](https://www.moesif.com/docs/platform/dynamic-sampling/) to set rules
without any code change or restarts. Moesif will still extrapolate original metrics so your reporting is accurate._

#### maskContent, (event) => event, optional

A function hook that enables you to mask any sensitive data in the event model. Your custom code must return the same
event, after applying any masking.

_For super sensitive data, Moesif recommends leveraging zero-knowledge security with [on-premises client-side encryption](https://www.moesif.com/docs/platform/secure-proxy/) and bring your own keys (BYOK)._

#### getMetadata, (event) => object, optional

Function that allow you to append arbitrary JSON metadata to API calls before being logged to Moesif.

#### host, string, optional

defaults to `api.moesif.net`. If you are using a proxy to send data to Moesif, please set the the host to `proxy.yourcompany.com`.

full options example:

```javascript
var options = {
  applicationId: "Your Publishable Moesif Application Id",
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
  host: 'proxy.acmeinc.com'
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

### Incorrect user tracking

If you see inaccuracies with your customer funnel such as user actions being associated to the wrong user, ensure you are calling `moesif.reset()` when a user logs out of your application. Without this step, Moesif has no knowledge that the user logged out and will continue to associate activity to the old user even if a new user logs into the same device/browser.

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

Note, this library has ZERO external dependencies (only have dev dependencies or dependencies for some of the examples).

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
