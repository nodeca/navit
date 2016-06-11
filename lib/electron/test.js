'use strict';


var debug      = require('debug')('navit');
var format     = require('util').format;
var assert     = require('chai').assert;
var _          = require('lodash');
var NavitError = require('../error');


var functions = [];


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
  var testVal = _.isFunction(value) ? value() : value;

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
  var testVal = _.isFunction(value) ? value() : value;

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

      debug(format("test.text('%s')", sel));

      message = message || format("test.text('%s') failed", sel);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (result.text === false) {
          callback(new NavitError(format("test.text('%s') failed - selector not found", sel)));
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

      debug(format("test.not.text('%s')", sel));

      message = message || format("test.not.text('%s') failed", sel);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (result.text === false) {
          callback(new NavitError(format("test.not.text('%s') failed - selector not found", sel)));
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

      debug(format("test.count('%s', %d)", sel, val));

      message = message || format("test.count('%s') failed", sel);

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, function (err, count) {
        if (err) {
          callback(err);
          return;
        }

        check(function () {
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

      debug(format("test.not.count('%s', %d)", sel, val));

      message = message || format("test.not.count('%s') failed", sel);

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, function (err, count) {
        if (err) {
          callback(err);
          return;
        }

        check(function () {
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

      this.__page__.evaluate.apply(this.__page__, [ fn ].concat(params).concat([ function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        check(function () {
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

      this.__page__.exec('webContents.getTitle', [], function (err, title) {
        if (err) {
          callback(err);
          return;
        }

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

      this.__page__.exec('webContents.getTitle', [], function (err, title) {
        if (err) {
          callback(err);
          return;
        }

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

      this.__page__.exec('webContents.getURL', [], function (err, url) {
        if (err) {
          callback(err);
          return;
        }

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

      this.__page__.exec('webContents.getURL', [], function (err, url) {
        if (err) {
          callback(err);
          return;
        }

        assertNotFlex(url, value, message, callback);
      });
    });

    return this;
  }
]);


module.exports = functions;
