var moesif = require('./moesif.cjs.js');
var superagent = require('superagent');

moesif.init({
  applicationId: 'Your Application',
  batchEnabled: true,
  batchSize: 5
});

moesif.start();

window.moesif = moesif;
