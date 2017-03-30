# Moesif JavaScript Browser Library

The Moesif Browser JavaScript Library is a set of methods attached to a global `moesif` object
intended to be used by websites to capture ajax apis to send over to [Moesif](https://www.moesif.com) 
for monitoring and error analysis.

Full documentation on Moesif integration is available [here](https://www.moesif.com/docs).

[Source Code on GitHub](https://github.com/moesif/moesif-browser-js)

[Package on NPMJS](https://www.npmjs.com/package/moesif-browser-js)

## How to install


### Using CDN to load the library


```html
<script src="//unpkg.com/moesif-browser-js@1.1.0/moesif.min.js"></script>
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


#### identifyUser, (string) => null

```
moesif.identifyUser('your user id');
```

Identifies the user if you have the userId. This is highly recommended. Even though we can auto
detect userIds but this helps tie all the events to the userId, and make it more easily searchable. 

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

#### maskContent, (event) => event

Optional function that let you mask any sensentive data in the event model, and then return
the masked event. Important that do not remove required fields in the event model. See the spec 
on the event model to see what is required. 

#### getTags, (event) => string, optional

Optional function that allow you to add tags to the event. 

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
  getTags: function(event) {
    if (event.request.uri.includes('stripe')) {
      return 'payment';
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
