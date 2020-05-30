var moesif = require('./moesif.cjs.js');
var superagent = require('superagent');

moesif.init({
  applicationId: 'Your Application Id',
  batchEnabled: true,
  batchSize: 5
});

moesif.start();

// console.log('test superagent');
// superagent.get('http://localhost:4250/heroes').then((result) => {
//   console.log('superagent return is here');
//   console.log(result);
// }).catch((err) => {
//   console.log('superagent failed');
//   console.log(err);
// });
