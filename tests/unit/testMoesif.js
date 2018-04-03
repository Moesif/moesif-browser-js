/**
 * Created by Xingheng on 2/1/17.
 */

// import os from 'os';
// import { expect } from 'chai';
// import jsdom from 'mocha-jsdom';
// import sinon from 'sinon';
// import nodeLocalStorage from 'node-localstorage';

// import { _ } from '../../src/utils';
// import moesifCreator from '../../src/moesif';



// jsdom({
//   url: 'https://www.moesif.com'
// });

// const triggerMouseEvent = function(node, eventType) {
//   node.dispatchEvent(new MouseEvent(eventType, {
//     bubbles: true,
//     cancelable: true,
//   }));
// };

// const simulateClick = function(el) {
//   triggerMouseEvent(el, "click");
// };

// describe('testing moesif main object', function() {


//   describe('should initiate properly', function() {
//     it('should initiates properly with only applicationId', function (done) {
//       var moesif = moesifCreator();
//       moesif.init({
//         applicationId: 'faketoken'
//       });

//       expect(moesif._options.applicationId === 'faketoken');
//       done();
//     });

//     it('should initiate properly with full options set', function (done) {

//       var moesif = moesifCreator();

//       var options = {
//         applicationId: 'your application id',
//         debug: true,
//         skip: function(event) {
//           if (event.request.uri.includes('google')) {
//             return true;
//           }
//           return false;
//         },
//         maskContent: function(event) {
//           if (event.request.headers['secret']) {
//             event.request.headers['secret'] = '';
//           }
//           return event;
//         },
//         getTags: function(event) {
//           if (event.request.uri.includes('stripe')) {
//             return 'payment';
//           }
//         }
//       };

//       moesif.init(options);

//       expect(moesif._options.debug);
//       expect(moesif._options.skip).to.exists;
//       expect(moesif._options.maskContent).to.exists;
//       expect(moesif._options.getTags).to.exists;
//       done();
//     });
//   });

//   describe('should fail to initiate', function() {
//     it('should throw an exception when there is no application Id', function () {
//       expect(function () {
//         var moesif = moesifCreator();
//         moesif.init({});
//       }).to.throw(Error);
//     });

//     it('should throw an exception when maskContent is not a function', function () {
//       expect(function () {
//         var moesif = moesifCreator();
//         moesif.init({
//           applicationId: 'your application id',
//           debug: true,
//           skip: function(event) {
//             if (event.request.uri.contains('google')) {
//               return true;
//             }
//             return false;
//           },
//           maskContent: 'abc',
//           getTags: function(event) {
//             if (event.request.uri.contains('stripe')) {
//               return 'payment';
//             }
//           }
//         });
//       }).to.throw(Error);
//     });
//   });

//   describe('identifyUser should work', function() {
//     it('set a userId and check localstorage', function (done) {
//       var moesif = moesifCreator();
//       moesif.init({
//         applicationId: 'faketoken'
//       });

//       moesif.identifyUser('myuser');
//       expect(moesif._getUserId()).to.equal('myuser');
//       expect(localStorage.getItem('moesif_stored_user_id')).to.equal('myuser');
//       done();
//     });
//   })
// });
