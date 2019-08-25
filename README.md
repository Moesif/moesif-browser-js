# Moesif JavaScript Browser SDK

[![NPM](https://nodei.co/npm/moesif-browser-js.png?compact=true&stars=true)](https://nodei.co/npm/moesif-browser-js/)

[![Built For][ico-built-for]][link-built-for]
[![Total Downloads][ico-downloads]][link-downloads]
[![Software License][ico-license]][link-license]
[![Source Code][ico-source]][link-source]

This SDK is a browser side middleware that captures AJAX API calls and user context and sends to [Moesif's](https://www.moesif.com) API analytics service.

_If you're using a Moesif server SDK to instrument your APIs serverside, you can use moesif-browser-js to collect additional customer context like email, sign up date, and web attribution._

This SDK can log API calls to:

- Your own APIs (such as APIs powering your Single Page Apps)
- 3rd party APIs (such as to Stripe and Twilio)
- Blockchains (such as transactions against your Ethereum Smart Contracts)

It has native support for RESTful, GraphQL, Ethereum Web3, and JSON-RPC APIs.

Full documentation on Moesif integration is available [here](https://www.moesif.com/docs).

[Source Code on GitHub](https://github.com/moesif/moesif-browser-js)

## How to install

Your Moesif Application Id can be found in the [_Moesif Portal_](https://www.moesif.com/).
After signing up for a Moesif account, your Moesif Application Id will be displayed during the onboarding steps. 

You can always find your Moesif Application Id at any time by logging 
into the [_Moesif Portal_](https://www.moesif.com/), click on the top right menu,
and then clicking _Installation_.

### Using CDN to load the library

```html
<script src="//unpkg.com/moesif-browser-js@^1/moesif.min.js"></script>
<script type="text/javascript">
var options = {
  applicationId: 'Your Moesif Application Id'
  // add other option here.
};

moesif.init(options);

// Start capturing AJAX API Calls.
moesif.start();

// Optionally, when the user logs in, identify user with Moesif
moesif.identifyUser('12345');
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

You can then require the lib like a standard Node.js module:

```javascript
var moesif = require('moesif-browser-js');

var options = {
  applicationId: 'Your Moesif Application Id'
  // add other option here.
};

moesif.init(options);

// Start capturing AJAX API Calls.
moesif.start();

// Optionally, when the user logs in, identify user with Moesif
moesif.identifyUser('12345');

```

With the `require` method, the `moesif` object is not attached to the global scope.

## List of Methods on the `moesif` Object

#### init, (obj) => null
Initialize the SDK with your Application Id and other options. This will also capture and store locally campaign information like UTM parameters. 

```
var options = {
  applicationId: 'Your Moesif Application Id'
};

moesif.init(options);

```

#### start, () => null

```
moesif.start()
```

Starts the capturing AJAX API calls. Should not be called before init.


#### stop, () => null

```
moesif.stop()
```

Stops the capturing. It is optional to call this, because if the browser is closed, the recording will stop.
The main use case is that to suspend the recording temporarily due to some event. Call `start` again to restart.

#### identifyUser, (string, object) => null

Identify the user with Moesif such as when a user logs into your app and you have a persistent userId.
You can also send custom metadata such as the customer's name and email. 

Identifies the user if you have the userId. This is highly recommended. Even though we can auto
detect userIds but this helps tie all the events to the userId, and make it more easily searchable.

```javascript
// When the user logs in and you have their unique userId, call identifyUser()
moesif.identifyUser('12345');

// Optionally, you can also send custom metadata like customer email and name
moesif.identifyUser('12345', {
  email: "johndoe@acmeinc.com",
  title: "software engineer",
  string_field: "some string"
  number_field: 123,
  object_field: {
    field_a: "value_a",
    field_b: "value_b"
  }
});
```

#### identifyCompany, (string, object) => null
Like identifyUser. If you're a B2B company, you can track companies or accounts in addition to users. 
You can include company traits like company domain or plan information.

```javascript
// When the company logs in and you have their companyId or accountId, call identifyCompany()
moesif.identifyCompany('67890');

// Optionally, you can also send custom metadata like company domain and plan details
moesif.identifyCompany('67890', {
  company_domain: "acmeinc.com",
  alexa_ranking: 500,
  plan_name: "free"
  number_field: 123,
  object_field: {
    field_a: "value_a",
    field_b: "value_b"
  }
});
```

#### identifySession, (string) => null

If you have a specific session token you want to track, you can pass to Moesif.

```javascript
moesif.identifySession('d23xdefc3ijhcv93hf4h38f90h43f');
```

#### useWeb3, (web3) => boolean

Sets the web3 JSON-RPC to use the web3 object passed in. If no argument is passed
in, it will try to restart capturing using the global `web3` object. Return `true` if successful.

```javascript
moesif.useWeb3(myWeb3Object)
```


## Configuration options

The `options` is an object that is passed into the SDK's init method.

#### applicationId - string, required

This is a token that is obtained from your Moesif account. This token can be safely used on the
client side.

#### skip, (event) => boolean, optional

Optional function that to determine on if a particular event should be skipped logging.
The parameter passed in is an event model. [Detail on the event model here](https://www.moesif.com/docs/api#create-an-event).

#### maskContent, (event) => event, optional

Optional function that let you mask any sensitive data in the event model, and then return
the masked event. Important that do not remove required fields in the event model. See the spec
on the event model to see what is required.

#### getMetadata, (event) => object, optional

Optional function that allow you to append arbitrary JSON metadata to API calls before being logged to Moesif. 

full options example:

```javascript

var options = {
  applicationId: 'Your Moesif Application Id',
  skip: function(event) {
    if (event.request.uri.includes('google')) {
      return true;
    }
    return false;
  },
  maskContent: function(event) {
    if (event.request.headers['secret']) {
      event.request.headers['secret'] = '';
    }
    return event;
  },
  getMetadata: function(event) {
    if (event.request.uri.includes('stripe')) {
      return {
        type: 'payment'
      };
    }
  }
};

moesif.init(options);

```

#### disableFetch, boolean, optional, default false.

Starting from version 1.4.0, this SDK also instruments fetch API if it is not polyfilled.
Some browsers may use fetch under XmlHTTPRequest, then it is possible events get duplicated. In this case, disable fetch will fix the issue.

## Ethereum dApp support

DApps (Decentralized Apps) are frontend apps which interact with blockchains such as Ethereum over an API.
For Ethereum, this API layer uses JSON-RPC and is called the [Ethereum Web3 API](https://github.com/ethereum/web3.js) which Moesif supports natively.

Moesif can capture the API call data directly from the client
side with `moesif-browser-js` which in turn can be used for debugging and monitoring issues, and alert you of anomalies.

Review the [tutorial for building an Ethereum DApp with Integrated Web3 Monitoring](https://www.moesif.com/blog/blockchain/ethereum/Tutorial-for-building-Ethereum-Dapp-with-Integrated-Error-Monitoring/).

[Please also checkout this document on how Moesif supports decentralized apps built on top of Ethereum Web3 and JSON-RPCs.](https://www.moesif.com/docs/platform/ethereum-web3/)

### Web3 object

Many Dapp clients such as the [Metamask](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en) extension and [Mist Browser](https://github.com/ethereum/mist), will inject a `web3` object directly in the browser's global scope.

The default `moesif-browser-js` config will automatically instrument the injected web3 object and capture outgoing API transactions to
the Ethereum network.

For advanced scenarios where your code uses a different web3 object than the one injected, then you should call `moesif.useWeb3(myWeb3);`
This insures the correct web3 instance is instrumented.

This can happen if you let users modify the selected web3 provider or change their network.

```javascript
if (typeof web3 !== 'undefined') {
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

- Example setup for [react-boilerplate](https://github.com/Moesif/moesif-react-boilerplate-example). For React apps, if you set up server side rendering, please ensure that this library is only initiated on the client side.
- Example setup for an [Etherum Dapp](https://github.com/Moesif/moesif-ethereum-js-example).

## Credits for moesif-browser-js

Some of the build scripts and directory structure is based on Mixpanel's Javascript Client Library,
which is under Apache 2.0 license.
Some utilities are based on underscore.

## Other integrations

To view more more documentation on integration options, please visit __[the Integration Options Documentation](https://www.moesif.com/docs/getting-started/integration-options/).__

[ico-built-for]: https://img.shields.io/badge/built%20for-javascript-blue.svg
[ico-downloads]: https://img.shields.io/npm/dt/moesif-browser-js.svg
[ico-license]: https://img.shields.io/badge/License-Apache%202.0-green.svg
[ico-source]: https://img.shields.io/github/last-commit/moesif/moesif-browser-js.svg?style=social

[link-built-for]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[link-downloads]: https://www.npmjs.com/package/moesif-browser-js
[link-license]: https://raw.githubusercontent.com/Moesif/moesif-browser-js/master/LICENSE
[link-source]: https://github.com/moesif/moesif-browser-js
