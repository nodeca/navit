'use strict';


const debug      = require('debug')('navit');
const assert     = require('chai').assert;
const _          = require('lodash');
const NavitError = require('../error');


let functions = [];


// Helper to get assertion error in `run` callback
//
// http://stackoverflow.com/questions/11235815/is-there-a-way-to-get-chai-working-with-asynchronous-mocha-tests
//
function check(f, done) {
  try {
    f();
  } catch (e) {
    done(e);
    return;
  }

  done();
}


// Helper to check is string result equals to value
//
// - result (String) - string to check
// - value (String|Function|RegExp) - string to check equal with result, function
//   for lazy value get or regexp to test
// - message (String) - assertion message
//
function assertFlex(result, value, message, callback) {
  let testVal = _.isFunction(value) ? value() : value;

  check(function () {
    if (_.isRegExp(testVal)) {
      assert.strictEqual(testVal.test(result), true, message);
    } else {
      assert.strictEqual(result, testVal, message);
    }
  }, callback);
}


// Helper to check is string result not equals to value
//
// - result (String) - string to check
// - value (String|Function|RegExp) - string to check not equal with result,
//   function for lazy value get or regexp to test
// - message (String) - assertion message
//
function assertNotFlex(result, value, message, callback) {
  let testVal = _.isFunction(value) ? value() : value;

  check(function () {
    if (_.isRegExp(testVal)) {
      assert.strictEqual(testVal.test(result), false, message);
    } else {
      assert.notStrictEqual(result, testVal, message);
    }
  }, callback);
}


// Check element text equal to value
//
functions.push([
  [ 'test.text' ],
  function test_text(selector, value, message) {
    this.__queue__.push(function test_text_step(callback) {
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(`test.text('${sel}')`);

      message = message || `test.text('${sel}') failed`;

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel, function (err, result) {
        if (err) return callback(err);

        if (result.text === false) {
          callback(new NavitError(`test.text('${sel}') failed - selector not found`));
          return;
        }

        assertFlex(result.text, value, message, callback);
      });
    });

    return this;
  }
]);


// Check element text not equal to value
//
functions.push([
  [ 'test.text.not', 'test.not.text' ],
  function test_not_text(selector, value, message) {
    this.__queue__.push(function test_not_text_step(callback) {
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(`test.not.text('${sel}')`);

      message = message || `test.not.text('${sel}') failed`;

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (result.text === false) {
          callback(new NavitError(`test.not.text('${sel}') failed - selector not found`));
          return;
        }

        assertNotFlex(result.text, value, message, callback);
      });
    });

    return this;
  }
]);


// Check elements count are equal to value
//
functions.push([
  [ 'test.count' ],
  function test_count(selector, value, message) {
    this.__queue__.push(function test_count_step(callback) {
      var sel = _.isFunction(selector) ? selector() : selector;
      var val = _.isFunction(value) ? value() : value;

      debug(`test.count('${sel}', ${val})`);

      message = message || `test.count('${sel}') failed`;

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, (err, count) => {
        if (err) return callback(err);

        check(() => {
          assert.strictEqual(count, val, _.isFunction(message) ? message() : message);
        }, callback);
      });
    });

    return this;
  }
]);


// Check elements count are not equal to value
//
functions.push([
  [ 'test.count.not', 'test.not.count' ],
  function test_not_count(selector, value, message) {
    this.__queue__.push(function test_not_count_step(callback) {
      var sel = _.isFunction(selector) ? selector() : selector;
      var val = _.isFunction(value) ? value() : value;

      debug(`test.not.count('${sel}', ${val})`);

      message = message || `test.not.count('${sel}') failed`;

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, (err, count) => {
        if (err) return callback(err);

        check(() => {
          assert.notStrictEqual(count, val, _.isFunction(message) ? message() : message);
        }, callback);
      });
    });

    return this;
  }
]);


// Evaluate and check result is true
//
functions.push([
  [ 'test.evaluate' ],
  function test_evaluate(fn /*[, params..., message]*/) {
    var params = Array.prototype.slice.call(arguments, 1, fn.length + 1);
    var message = arguments.length > fn.length + 1 ? arguments[fn.length + 1] : null;

    this.__queue__.push(function test_evaluate_step(callback) {
      debug('test.evaluate()');

      message = message || 'test.evaluate() failed, evaluated function should return true';

      this.__page__.evaluate.apply(this.__page__, [ fn ].concat(params).concat([ (err, result) => {
        if (err) return callback(err);

        check(() => {
          assert.strictEqual(result, true, message);
        }, callback);
      } ]));
    });

    return this;
  }
]);


// Check title to equal to value
//
functions.push([
  [ 'test.title' ],
  function test_title(value, message) {
    this.__queue__.push(function test_title_step(callback) {
      debug('test.title()');

      message = message || 'test.title() failed';

      this.__page__.exec('webContents.getTitle', [], (err, title) => {
        if (err) return callback(err);

        assertFlex(title, value, message, callback);
      });
    });

    return this;
  }
]);


// Check title to not equal to value
//
functions.push([
  [ 'test.title.not', 'test.not.title' ],
  function test_not_title(value, message) {
    this.__queue__.push(function test_not_title_step(callback) {
      debug('test.not.title()');

      message = message || 'test.not.title() failed';

      this.__page__.exec('webContents.getTitle', [], (err, title) => {
        if (err) return callback(err);

        assertNotFlex(title, value, message, callback);
      });
    });

    return this;
  }
]);


// Check url to equal to value
//
functions.push([
  [ 'test.url' ],
  function test_url(value, message) {
    this.__queue__.push(function test_url_step(callback) {
      debug('test.url()');

      message = message || 'test.url() failed';

      this.__page__.exec('webContents.getURL', [], (err, url) => {
        if (err) return callback(err);

        assertFlex(url, value, message, callback);
      });
    });

    return this;
  }
]);


// Check title to not equal to value
//
functions.push([
  [ 'test.url.not', 'test.not.url' ],
  function test_not_url(value, message) {
    this.__queue__.push(function test_not_url_step(callback) {
      debug('test.not.url()');

      message = message || 'test.not.url() failed';

      this.__page__.exec('webContents.getURL', [], (err, url) => {
        if (err) return callback(err);

        assertNotFlex(url, value, message, callback);
      });
    });

    return this;
  }
]);


module.exports = functions;
