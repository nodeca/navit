'use strict';


var assert = require('chai').assert;


var functions = [];


// Helper to get assertion error in `run` callback
//
// http://stackoverflow.com/questions/11235815/is-there-a-way-to-get-chai-working-with-asynchronous-mocha-tests
//
function check(f, done) {
  try {
    f();
    done();
  } catch (e) {
    done(e);
  }
}


// Check element text equal to value
//
functions.push([
  [ 'test.text' ],
  function (selector, value) {
    var result = [];

    this.get.text(selector, result);

    this.__queue__.push([ [ value ], function text(value, callback) {
      check(function () {
        assert.equal(result.pop(), value);
      }, callback);
    } ]);

    return this;
  }
]);


// Check element text not equal to value
//
functions.push([
  [ 'test.text.not', 'test.notText' ],
  function (selector, value) {
    var result = [];

    this.get.text(selector, result);

    this.__queue__.push([ [ value ], function notText(value, callback) {
      check(function () {
        assert.notEqual(result.pop(), value);
      }, callback);
    } ]);

    return this;
  }
]);


// Check elements count are equal to value
//
functions.push([
  [ 'test.count' ],
  function (selector, value) {
    var result = [];

    this.get.count(selector, result);

    this.__queue__.push([ [ value ], function count(value, callback) {
      check(function () {
        assert.equal(result.pop(), value);
      }, callback);
    } ]);

    return this;
  }
]);


// Check elements count are not equal to value
//
functions.push([
  [ 'test.count.not', 'test.notCount' ],
  function (selector, value) {
    var result = [];

    this.get.count(selector, result);

    this.__queue__.push([ [ value ], function notCount(value, callback) {
      check(function () {
        assert.notEqual(result.pop(), value);
      }, callback);
    } ]);

    return this;
  }
]);



module.exports = functions;
