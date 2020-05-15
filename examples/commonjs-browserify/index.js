var moesif = require('./moesif.cjs.js');

moesif.init({
  applicationId: 'Your Application ID',
  batch: true,
  batch_size: 2,
});

moesif.start();