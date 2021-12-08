'use strict';


const debug      = require('debug')('navit');
const assert     = require('chai').assert;
const NavitError = require('../error');
const unfunc     = require('../utils').unfunc;


let functions = [];


// Helper to check is string result equals to value
//
// - result (String) - string to check
// - value (String|RegExp) - string to check equal with result or regexp to test
// - message (String) - assertion message
//
function assertFlex(result, value, message) {
  if (value instanceof RegExp) {
    assert.match(result, value, message);
  } else {
    assert.strictEqual(result, value, message);
  }
}


// Helper to check is string result not equals to value
//
// - result (String) - string to check
// - value (String|RegExp) - string to check not equal with result, or regexp to test
// - message (String) - assertion message
//
function assertNotFlex(result, value, message) {
  if (value instanceof RegExp) {
    assert.notMatch(result, value, message);
  } else {
    assert.notStrictEqual(result, value, message);
  }
}


// Check element text equal to value
//
functions.push([
  [ 'test.text' ],
  function test_text(selector, value, message) {
    this.__queue__.push(async function test_text_step() {
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.text('${sel}', '${val}')`);

      message = message || `test.text('${sel}', '${val}') failed`;

      let result = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel);

      if (result.text === false) {
        throw new NavitError(`test.text('${sel}, '${val}'') failed - selector not found`);
      }

      assertFlex(result.text, val, message);
    });

    return this;
  }
]);


// Check element text not equal to value
//
functions.push([
  [ 'test.text.not', 'test.not.text' ],
  function test_not_text(selector, value, message) {
    this.__queue__.push(async function test_not_text_step() {
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.not.text('${sel}, '${val}')`);

      message = message || `test.not.text('${sel}, '${val}') failed`;

      let result = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel);

      if (result.text === false) {
        throw new NavitError(`test.not.text('${sel}', '${val}') failed - selector not found`);
      }

      assertNotFlex(result.text, val, message);
    });

    return this;
  }
]);


// Check elements count are equal to value
//
functions.push([
  [ 'test.count' ],
  function test_count(selector, value, message) {
    this.__queue__.push(async function test_count_step() {
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.count('${sel}', ${val})`);

      message = message || `test.count('${sel}', ${val}) failed`;

      let count = await this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel);

      assert.strictEqual(count, val, unfunc(message));
    });

    return this;
  }
]);


// Check elements count are not equal to value
//
functions.push([
  [ 'test.count.not', 'test.not.count' ],
  function test_not_count(selector, value, message) {
    this.__queue__.push(async function test_not_count_step() {
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.not.count('${sel}', ${val})`);

      message = message || `test.not.count('${sel}', ${val}) failed`;

      let count = await this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel);

      assert.notStrictEqual(count, val, unfunc(message));
    });

    return this;
  }
]);


// Evaluate and check result is true
//
functions.push([
  [ 'test.evaluate' ],
  function test_evaluate(fn /*[, params..., message]*/) {
    let params = Array.prototype.slice.call(arguments, 1, fn.length + 1);
    let message = arguments.length > fn.length + 1 ? arguments[fn.length + 1] : null;

    this.__queue__.push(async function test_evaluate_step() {
      debug('test.evaluate()');

      let result = await this.__page__.evaluate.apply(this.__page__, [ fn ].concat(params));

      message = message || `test.evaluate() should return true, instead of ${result}`;

      assert.strictEqual(result, true, message);
    });

    return this;
  }
]);


// Check title to equal to value
//
functions.push([
  [ 'test.title' ],
  function test_title(value, message) {
    this.__queue__.push(async function test_title_step() {
      let val = unfunc(value);

      debug(`test.title('${val}')`);

      message = message || `test.title('${val}') failed`;

      let title = await this.__page__.invoke('win', 'webContents.getTitle');

      assertFlex(title, val, message);
    });

    return this;
  }
]);


// Check title to not equal to value
//
functions.push([
  [ 'test.title.not', 'test.not.title' ],
  function test_not_title(value, message) {
    this.__queue__.push(async function test_not_title_step() {
      let val = unfunc(value);

      debug(`test.not.title('${val}')`);

      message = message || `test.not.title('${val}') failed`;

      let title = await this.__page__.invoke('win', 'webContents.getTitle');

      assertNotFlex(title, val, message);
    });

    return this;
  }
]);


// Check url to equal to value
//
functions.push([
  [ 'test.url' ],
  function test_url(value, message) {
    this.__queue__.push(async function test_url_step() {
      let val = unfunc(value);

      debug(`test.url('${val}')`);

      message = message || `test.url('${val}') failed`;

      let url = await this.__page__.invoke('win', 'webContents.getURL');

      assertFlex(url, val, message);
    });

    return this;
  }
]);


// Check title to not equal to value
//
functions.push([
  [ 'test.url.not', 'test.not.url' ],
  function test_not_url(value, message) {
    this.__queue__.push(async function test_not_url_step() {
      let val = unfunc(value);

      debug(`test.not.url('${val}')`);

      message = message || `test.not.url('${val}') failed`;

      let url = await this.__page__.invoke('win', 'webContents.getURL');

      assertNotFlex(url, val, message);
    });

    return this;
  }
]);


// Check response body equals to value
//
functions.push([
  [ 'test.body' ],
  function test_body(value, message) {
    this.__queue__.push(async function test_body_step() {
      let val = unfunc(value);

      debug(`test.body(${val})`);

      message = message || `test.body(${val}) failed`;

      let content = await this.__getContentSource__();

      assertFlex(content, val, message);
    });

    return this;
  }
]);


// Check response body not equals to value
//
functions.push([
  [ 'test.not.body', 'test.body.not' ],
  function test_not_body(value, message) {
    this.__queue__.push(async function test_not_body_step() {
      let val = unfunc(value);

      debug(`test.not.body(${val})`);

      message = message || `test.not.body(${val}) failed`;

      let content = await this.__getContentSource__();

      assertNotFlex(content, value, message);
    });

    return this;
  }
]);


module.exports = functions;
