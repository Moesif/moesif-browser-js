var moesif = require('./moesif.cjs.js');

moesif.init({
  applicationId: 'Your Application Id',
  batch: true,
  batch_size: 5,
});

moesif.start();