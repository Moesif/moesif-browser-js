var moesif = require('./moesif.cjs.js');

moesif.init({
  applicationId: 'Your Application Id',
  batchEnabled: true,
  batchSize: 5
});

moesif.start();