var moesif = require('./moesif.cjs.js');
var superagent = require('superagent');

moesif.init({
  applicationId: 'Your Application Id',
  batchEnabled: true,
  batchSize: 5,
  persistence: 'cookie',
  cookieExpiration: 25
});

moesif.start();

window.moesif = moesif;
