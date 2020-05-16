# Moesif JavaScript Browser SDK

[![NPM](https://nodei.co/npm/moesif-browser-js.png?compact=true&stars=true)](https://nodei.co/npm/moesif-browser-js/)

[![Built For][ico-built-for]][link-built-for]
[![Total Downloads][ico-downloads]][link-downloads]
[![Software License][ico-license]][link-license]
[![Source Code][ico-source]][link-source]

The Moesif browser SDK enables you to track user behavior and their website actions and send to [Moesif's](https://www.moesif.com) API analytics service. This SDK can be used in conjunction with a [Moesif server SDK](https://www.moesif.com/implementation) to monitor API usage. This enables you map out the entire customer journey from from _clicked sign up_ to _made first API call._

The SDK also pulls useful data from a user's device including any marketing attribution, device type, and location information and stores in the user and/or company profile in Moesif. You can add additional customer properties such as user email and company domain via the `identifyUser()` and `identifyCompany()` methods.

If required, this SDK can also log outgoing AJAX API calls to third party APIs with the `start()` method. API logging has native support for RESTful, GraphQL, Ethereum Web3, JSON-RPC, and other APIs

Full documentation on Moesif integration is available [here](https://www.moesif.com/docs).

[Source Code on GitHub](https://github.com/moesif/moesif-browser-js)

## How to install

### Using CDN to load the library

```html
<script src="//unpkg.com/moesif-browser-js@^1/moesif.min.js"></script>
<script type="text/javascript">
  // Initialize the SDK. Must be called before any other methods
  moesif.init({
    applicationId: "Your Moesif Application Id",
    // add other option here
  });

  // Optionally, start logging AJAX API Calls
  moesif.start();

  // Identify the user with Moesif such as when user logs in
  moesif.identifyUser("12345");

  // Log UI actions like clicked sign up
  moesif.track("clicked_sign_up", {
    button_label: "Get Started",
  });
</script>
```

Put the above script tags in between the `<head>` tags of your html page.
It will attach a global `moesif` object. You can access it either via `moesif` or `window.moesif`.

### Alternative installation via NPM

This SDK is also available as a [package on NPM](https://www.npmjs.com/package/moesif-browser-js).
The moesif-browser-js SDK is indended for running on the client side. For instrumneting APIs on the server side, there is a separate SDK, [moesif-express](https://www.npmjs.com/package/moesif-express) available on NPM.

To install into a project using NPM with a front-end packager such as
[Browserify](http://browserify.org/) or [Webpack](https://webpack.github.io/):

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

// Optionally, start logging AJAX API Calls
moesif.start();

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

### Storing user metadata

While optional, in addition to identifying the user id, you can also pass in user demographic and other info as a custom object.

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

### Storing company metadata

A user can be linked to a company which can be helpful to track account level usage if your are a B2B company.

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

## List of Methods on the `moesif` Object

#### init, (obj) => null

Initialize the SDK with your Application Id and any other options. On initialization, the SDK will capture initial user context like device and attribution information. Must be called before any other methods like `start()` or `identifyUser`.

```
var options = {
  applicationId: 'Your Moesif Application Id'
};

moesif.init(options);

```

#### identifyUser, (string, object) => null

When a user logs into your website and you have their user id, identify the user with your userId.
You can also add custom metadata containing fields like the customer's name and email as the second argument.

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

#### identifyCompany, (string, object, string) => null

Similar to `identifyUser`, but for tracking companies which is recommended for B2B companies.
You can use both `identifyUser` and `identifyCompany` or just one. If both are used, the user is linked as a member of the company.

Only the first argument is a string containing the company id. This is the only required field.
The second argument is a object used to store a company info like plan, MRR, and company demographics.
The third argument is a string containing company website or email domain. If set, Moesif will enrich your profiles with publicly available info.

```javascript
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

#### identifySession, (string) => null

The Moesif SDK wil track sessions automatically, but if you have a specific session token you want to track, you can pass to Moesif directly.

The new session token will continue to be used until `identifySession` is called again.

```javascript
moesif.identifySession("d23xdefc3ijhcv93hf4h38f90h43f");
```

#### track, (string, object) => null

Track user actions such as "clicked sign up" or "made a purchase". By tracking user actions in addition to API usage via one of the [Moesif server SDKs](https://www.moesif.com/implementation), you'll be able to understand the entire customer journey from inital sign up to first API call. First argument is an action name as a string, which is required. Second parameter is an optional metadata object related to this action event. [See API Reference](https://www.moesif.com/docs/api#track-a-user-action)

```
moesif.track('clicked_sign_up', {
  button_label: 'Get Started'
});
```

#### start, () => null

```
moesif.start()
```

When you call `start()`, this SDK will log API calls to:

- Your own APIs (such as an API powering your Single Page App)
- 3rd party APIs (such as to Stripe and Twilio)
- Decentralized APIs such as DApps communicating with Ethereum Web3/interactions with smart contracts

#### stop, () => null

```
moesif.stop()
```

Stops logging API calls. It is not required to call this, since recording will stop automatically when the browser tab is closed. However, you can call `stop` directly if you want more control. Call `start` again to restart logging.

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

#### disableFetch, boolean, optional, default false.

Starting from version 1.4.0, this SDK also instruments fetch API if it is not polyfilled.
Some browsers may use fetch under XmlHTTPRequest, then it is possible events get duplicated. In this case, disable fetch will fix the issue.

#### batchEnabled, boolean, optional, default false.

Will start batching the tracking of API Events and User Actions to sent to Moesif. The identifyUser and identifyCompanies are not batched.

#### batchSize, number, optional, default 25

Even if set, the batchSize is used on a best effort basis. If the payloads sizes get too big, the batchSize maybe auto adjusted.

#### batchMaxTime, number in milliseconds, optional, default 2500

The maximum interval to flush the queue when the batch size have not been reached.

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
- Example setup for [react-boilerplate](https://github.com/Moesif/moesif-react-boilerplate-example). For React apps, if you set up server side rendering, please ensure that this library is only initiated on the client side.
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
