'use strict';


const debug      = require('debug')('navit');
const assert     = require('chai').assert;
const _          = require('lodash');
const NavitError = require('../error');
const unfunc     = require('../utils').unfunc;


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
// - value (String|RegExp) - string to check equal with result or regexp to test
// - message (String) - assertion message
//
function assertFlex(result, value, message, callback) {
  check(function () {
    if (_.isRegExp(value)) {
      assert.strictEqual(value.test(result), true, message);
    } else {
      assert.strictEqual(result, value, message);
    }
  }, callback);
}


// Helper to check is string result not equals to value
//
// - result (String) - string to check
// - value (String|RegExp) - string to check not equal with result, or regexp to test
// - message (String) - assertion message
//
function assertNotFlex(result, value, message, callback) {
  check(function () {
    if (_.isRegExp(value)) {
      assert.strictEqual(value.test(result), false, message);
    } else {
      assert.notStrictEqual(result, value, message);
    }
  }, callback);
}


// Check element text equal to value
//
functions.push([
  [ 'test.text' ],
  function test_text(selector, value, message) {
    this.__queue__.push(function test_text_step(callback) {
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.text('${sel}', '${val}')`);

      message = message || `test.text('${sel}', '${val}') failed`;

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel, function (err, result) {
        if (err) return callback(err);

        if (result.text === false) {
          callback(new NavitError(`test.text('${sel}, '${val}'') failed - selector not found`));
          return;
        }

        assertFlex(result.text, val, message, callback);
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
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.not.text('${sel}, '${val}')`);

      message = message || `test.not.text('${sel}, '${val}') failed`;

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (result.text === false) {
          callback(new NavitError(`test.not.text('${sel}', '${val}') failed - selector not found`));
          return;
        }

        assertNotFlex(result.text, val, message, callback);
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
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.count('${sel}', ${val})`);

      message = message || `test.count('${sel}', ${val}) failed`;

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, (err, count) => {
        if (err) return callback(err);

        check(() => {
          assert.strictEqual(count, val, unfunc(message));
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
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.not.count('${sel}', ${val})`);

      message = message || `test.not.count('${sel}', ${val}) failed`;

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, (err, count) => {
        if (err) return callback(err);

        check(() => {
          assert.notStrictEqual(count, val, unfunc(message));
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
      let val = unfunc(value);

      debug(`test.title('${val}')`);

      message = message || `test.title('${val}') failed`;

      this.__page__.invoke('win', 'webContents.getTitle', (err, title) => {
        if (err) return callback(err);

        assertFlex(title, val, message, callback);
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
      let val = unfunc(value);

      debug(`test.not.title('${val}')`);

      message = message || `test.not.title('${val}') failed`;

      this.__page__.invoke('win', 'webContents.getTitle', (err, title) => {
        if (err) return callback(err);

        assertNotFlex(title, val, message, callback);
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
      let val = unfunc(value);

      debug(`test.url('${val}')`);

      message = message || `test.url('${val}') failed`;

      this.__page__.invoke('win', 'webContents.getURL', (err, url) => {
        if (err) return callback(err);

        assertFlex(url, val, message, callback);
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
      let val = unfunc(value);

      debug(`test.not.url('${val}')`);

      message = message || `test.not.url('${val}') failed`;

      this.__page__.invoke('win', 'webContents.getURL', (err, url) => {
        if (err) return callback(err);

        assertNotFlex(url, val, message, callback);
      });
    });

    return this;
  }
]);


// Check response body equals to value
//
functions.push([
  [ 'test.body' ],
  function test_body(value, message) {
    this.__queue__.push(function test_body_step(callback) {
      let val = unfunc(value);

      debug(`test.body(${val})`);

      message = message || `test.body(${val}) failed`;

      this.__getContentSource__((err, content) => {
        if (err) return callback(err);

        assertFlex(content, val, message, callback);
      });
    });

    return this;
  }
]);


// Check response body not equals to value
//
functions.push([
  [ 'test.not.body', 'test.body.not' ],
  function test_not_body(value, message) {
    this.__queue__.push(function test_not_body_step(callback) {
      let val = unfunc(value);

      debug(`test.not.body(${val})`);

      message = message || `test.not.body(${val}) failed`;

      this.__getContentSource__((err, content) => {
        if (err) return callback(err);

        assertNotFlex(content, value, message, callback);
      });
    });

    return this;
  }
]);


module.exports = functions;
