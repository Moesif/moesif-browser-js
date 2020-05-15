var moesif = require('./moesif.cjs.js');

moesif.init({
  applicationId: 'Your Application Id',
  batch: true,
  batchSize: 5,
});

moesif.start();