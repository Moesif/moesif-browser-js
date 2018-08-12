# Moesif JavaScript Browser Library

The library is a browser side middleware that automatically
captures outgoing API calls and sends to [Moesif](https://www.moesif.com)
for API monitoring and error analysis.

The library can be used for browser apps making AJAX calls to either your own API or
public APIs like Stripe and Twilio.

The SDK has native support for RESTful, GraphQL, Ethereum Web3, and RPC APIs.

Full documentation on Moesif integration is available [here](https://www.moesif.com/docs).

[Source Code on GitHub](https://github.com/moesif/moesif-browser-js)

[Package on NPMJS](https://www.npmjs.com/package/moesif-browser-js)

## How to install


### Using CDN to load the library


```html
<script src="//unpkg.com/moesif-browser-js@1.2.0/moesif.min.js"></script>
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

This library is available as a [package on NPM](https://www.npmjs.com/package/moesif-browser-js)
(named `moesif-browser-js` to clarify this javascript library is for the client side. (There is also
 moesif-expressjs for express middleware and moesif-nodejs for basic APIs).

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


### DApp Support: Capture Ethereum Web3 JSON-RPC calls.

DApp (Distributed Apps) are apps that are often build using Smart Contracts with an UI odwnr built in Javascript. And the UI can communicate with the blockchain network via JSON-RPC.
We wrote an [in-depth tutorial on this DApp and how to build them](https://www.moesif.com/blog/blockchain/ethereum/Tutorial-for-building-Ethereum-Dapp-with-Integrated-Error-Monitoring/).

If user is are using [Metamask](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en) extension or [Mist Browser](https://github.com/ethereum/mist), a `web3` object is injected into the browser's global scope.

So by default, `moesif-browser-js` will detect if there is a `web3` object already injected,
and will try to start capture the data using that default web3 object.

However, there are scenarios that your DApp let users chose or modify the web3 provider, or change network, or you modify or replace the global `web3` object or the provider object.

Under those scenarios, in order to capture the web3 JSON-RPC calls, at the time you replaced/modified/created `web3` object or `web3Provider`, you should update `moesif` by
invoking:

```

moesif.useWeb3(myWeb3);

```

#### Double capture of web3 transactions.

By default, `moesif-browser-js` captures data at `XMLHttpRequest` layer, and if `web3` object is detected or passed with `moesif.useWeb3()`, it also captures data at web3 layer.

So if a web3 provider is also using the XMLHttpRequest (like the HttpProvider), it is possible that the same transaction is captured twice. This is ok and expected.

We do make a distinction, for events that are captured at `web3` layer, we add additional metadata for the web3 provider used. If you open up the captured event in Moesif Dashboard, under `metadata` tab, you will see an `_web3` object, like this:

```
{
  _web3: {
    via_web3_provider:true
    is_metamask:true
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

## Credits for moesif-browser-js

Some of the build scripts and directory structure is based on Mixpanel's Javascript Client Library,
which is under Apache 2.0 license.
Some utilities are based on underscore.

## Other integrations

To view more more documentation on integration options, please visit __[the Integration Options Documentation](https://www.moesif.com/docs/getting-started/integration-options/).__
