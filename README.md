# Moesif JavaScript Browser SDK

[![NPM](https://nodei.co/npm/moesif-browser-js.png?compact=true&stars=true)](https://nodei.co/npm/moesif-browser-js/)

[![Built For][ico-built-for]][link-built-for]
[![Total Downloads][ico-downloads]][link-downloads]
[![Software License][ico-license]][link-license]
[![Source Code][ico-source]][link-source]

This SDK is a browser side middleware that automatically
captures _outgoing_ API/AJAX calls and sends to [Moesif's](https://www.moesif.com)
AI-powered API analytics service.

This SDK can be configured to log API calls to:

- Your own APIs (such as APIs powering your Single Page Apps)
- 3rd party APIs (such as to Stripe and Twilio)
- Blockchains (such as transactions against your Ethereum Smart Contracts)

It has native support for RESTful, GraphQL, Ethereum Web3, and JSON-RPC APIs.

Full documentation on Moesif integration is available [here](https://www.moesif.com/docs).

[Source Code on GitHub](https://github.com/moesif/moesif-browser-js)

## How to install


### Using CDN to load the library


```html
<script src="//unpkg.com/moesif-browser-js@1.4.0/moesif.min.js"></script>
<script type="text/javascript">
var options = {
  applicationId: 'Your Application Id'
  // add other option here.
};

// for options see below.
moesif.init(options);

// this starts the capturing of the data.
moesif.start();
</script>
```

Put the above script tags in between the `<head>` tags of your html page.
It will attach a global `moesif` object. You can access it either via `moesif` or `window.moesif`.

### Alternative installation via NPM

This SDK is also available as a [package on NPM](https://www.npmjs.com/package/moesif-browser-js).
The moesif-browser-js SDK is indended for running on the client side. For capturing API calls on the server side, there is a separate [moesif-express SDK](https://www.npmjs.com/package/moesif-express) available on NPM.

To install into a project using NPM with a front-end packager such as
[Browserify](http://browserify.org/) or [Webpack](https://webpack.github.io/):

```sh
npm install --save moesif-browser-js
```

You can then require the lib like a standard Node.js module:

```javascript
var moesif = require('moesif-browser-js');

var options = {
  applicationId: 'Your Application Id'
  // add other option here.
};

// for options see below.
moesif.init(options);

// this starts the capturing of the data.
moesif.start();

// when the user logs in your system you can tie all the event to a particular user.

moesif.identifyUser('your unique userId');

```

With the `require` method, the `moesif` object is not attached to the global scope.


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

## List of Methods on the `moesif` Object

#### init, (obj) => null

```
var options = {
  applicationId: 'your applicationId'
};

moesif.init(options);

```

Initializes the moesif object with applicationId and other options. See the full list of options
in the next section. Call this before calling `start()`.

#### start

```
moesif.start()
```

Starts the capturing. Should not be called before init.

#### stop, () => null

```
moesif.stop()
```

Stops the capturing. It is optional to call this, because if the browser is closed, the recording will stop.
The main use case is that to suspend the recording temporarily due to some event. Call `start` again to restart.


#### useWeb3, (web3) => boolean

```
moesif.useWeb3(myWeb3Object)

```

Reset the web3 JSON-RPC capturing using the web3 object passed in. If no argument is passed
in, it will try to restart capturing using the global `web3` object. Return `true` if successful.

#### identifyUser, (string, object) => null

```

moesif.identifyUser('your user id');
```
or

```javascript

var userMetadata = {
  email: 'user@usergmail.com',
  customdata1: 'data1'
}

moesif.identifyUser('your user id', userMetadata);
```

Identifies the user if you have the userId. This is highly recommended. Even though we can auto
detect userIds but this helps tie all the events to the userId, and make it more easily searchable.

Best place to trigger this is when user logs in or signs up.

You can also pass in optional profile data for the user. The `userMetadata` can by any valid Json.
If present, Moesif will detect special metadata fields like:

- email
- name
- first_name
- last_name
- phone
- photo_url

#### identifySession, (string) => null

```
moesif.identifySession('your sessionId');
```


## Configuration options

The `options` is an object that is passed into moesif's init method.

#### applicationId - string, required

This is a token that is obtained from your moesif account. This token can be safely used on the
client side.


#### skip, (event) => boolean, optional

Optional function that to determine on if a particular event should be skipped logging.
The parameter passed in is an event model. [Detail on the event model here](https://www.moesif.com/docs/api#create-an-event).

#### maskContent, (event) => event, optional

Optional function that let you mask any sensitive data in the event model, and then return
the masked event. Important that do not remove required fields in the event model. See the spec
on the event model to see what is required.

#### getMetadata, (event) => object, optional

Optional function that allow you to add metadata to the event. The metadata can be any JSON object.

#### getTags, (event) => string, optional

This that allow you to add tags to the event. Will be deprecated, use getMetadata instead.

full options example:

```javascript

var options = {
  applicationId: 'your application id',
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
