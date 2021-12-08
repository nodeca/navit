'use strict';


const debug      = require('debug')('navit');
const assert     = require('assert');
const NavitError = require('../error');
const unfunc     = require('../utils').unfunc;


let functions = [];


// Helper to check is string result equals to value
//
// - result (String) - string to check
// - value (String|Function|RegExp) - string to check equal with result, function
//   for lazy value get or regexp to test
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
// - value (String|Function|RegExp) - string to check not equal with result,
//   function for lazy value get or regexp to test
// - message (String) - assertion message
//
function assertNotFlex(result, value, message) {
  if (value instanceof RegExp) {
    assert.doesNotMatch(result, value, message);
  } else {
    assert.notStrictEqual(result, value, message);
  }
}


// Check element attribute equal to value
//
functions.push([
  [ 'test.attribute' ],
  function test_attribute(selector, attribute, value, message) {
    this.__queue__.push(async function test_attribute_step() {
      let sel  = unfunc(selector);
      let attr = unfunc(attribute);
      let val  = unfunc(value);

      debug(`test.attribute('${sel}', '${attr}', '${val}')`);

      message = message || `test.attribute('${sel}', '${attr}', '${val}') failed`;

      let result = await this.__page__.evaluate(function (selector, attribute) {
        let element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.getAttribute(attribute) };
      }, sel, attr);

      if (!result.exists) {
        throw new NavitError(`test.attribute('${sel}', '${attr}', '${val}') failed - selector not found`);
      }

      assertFlex(result.value, val, message);
    });

    return this;
  }
]);


// Check element attribute not equal to value
//
functions.push([
  [ 'test.attribute.not', 'test.not.attribute' ],
  function test_not_attribute(selector, attribute, value, message) {
    this.__queue__.push(async function test_not_attribute_step() {
      let sel  = unfunc(selector);
      let attr = unfunc(attribute);
      let val  = unfunc(value);

      debug(`test.not.attribute('${sel}', '${attr}', '${val}')`);

      message = message || `test.not.attribute('${sel}', '${attr}', '${val}') failed`;

      let result = await this.__page__.evaluate(function (selector, attribute) {
        let element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.getAttribute(attribute) };
      }, sel, attr);

      if (!result.exists) {
        throw new NavitError(`test.not.attribute('${sel}', '${attr}', '${val}') failed - selector not found`);
      }

      assertNotFlex(result.value, val, message);
    });

    return this;
  }
]);


// Check element exists
//
functions.push([
  [ 'test.exists' ],
  function test_exists(selector, message) {
    this.__queue__.push(async function test_exists_step() {
      let sel = unfunc(selector);

      debug(`test.exists('${sel}')`);

      message = message || `test.exists('${sel}') failed`;

      let count = await this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel);

      // TODO: we should cast result to number in case of
      // https://github.com/baudehlo/node-phantom-simple/issues/43
      count = +count;

      assert.strictEqual(count > 0, true, message);
    });

    return this;
  }
]);


// Check element not exists
//
functions.push([
  [ 'test.not.exists', 'test.exists.not' ],
  function test_not_exists(selector, message) {
    this.__queue__.push(async function test_not_exists_step() {
      let sel = unfunc(selector);

      debug(`test.not.exists('${sel}')`);

      message = message || `test.not.exists('${sel}') failed`;

      let count = await this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel);

      // TODO: we should cast count to number in case of
      // https://github.com/baudehlo/node-phantom-simple/issues/43
      count = +count;

      assert.strictEqual(count === 0, true, message);
    });

    return this;
  }
]);


// Check element visible
//
functions.push([
  [ 'test.visible' ],
  function test_visible(selector, message) {
    this.__queue__.push(async function test_visible_step() {
      let sel = unfunc(selector);

      debug(`test.visible('${sel}')`);

      message = message || `test.visible('${sel}') failed`;

      let result = await this.__page__.evaluate(function (selector) {
        let elem = document.querySelector(selector);

        if (!elem) return { exists: false };

        let style = window.getComputedStyle(elem);

        return {
          exists: true,
          // http://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
          visible: elem.offsetParent !== null || (style.display !== 'none' && style.position === 'fixed')
        };
      }, sel);

      if (!result.exists) {
        throw new NavitError(`test.visible('${sel}') failed - selector not found`);
      }

      assert.strictEqual(result.visible, true, message);
    });

    return this;
  }
]);


// Check element not visible
//
functions.push([
  [ 'test.not.visible', 'test.visible.not' ],
  function test_not_visible(selector, message) {
    this.__queue__.push(async function test_not_visible_step() {
      let sel = unfunc(selector);

      debug(`test.not.visible('${sel}')`);

      message = message || `test.not.visible('${sel}') failed`;

      let result = await this.__page__.evaluate(function (selector) {
        let elem = document.querySelector(selector);

        if (!elem) {
          return { exists: false };
        }

        let style = window.getComputedStyle(elem);

        return {
          exists: true,
          // http://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
          visible: elem.offsetParent !== null || (style.display !== 'none' && style.position === 'fixed')
        };
      }, sel);

      if (!result.exists) {
        throw new NavitError(`test.not.visible('${sel}') failed - selector not found`);
      }

      assert.strictEqual(result.visible, false, message);
    });

    return this;
  }
]);


// Check status equals to value
//
functions.push([
  [ 'test.status' ],
  function test_status(value, message) {
    this.__queue__.push(async function test_status_step() {
      let val = unfunc(value);

      debug(`test.status(${val})`);

      message = message || `test.status(${val}) failed (got ${this.__response__.status})`;

      assert.strictEqual(this.__response__.status, val, message);
    });

    return this;
  }
]);


// Check status not equals to value
//
functions.push([
  [ 'test.not.status', 'test.status.not' ],
  function test_not_status(value, message) {
    this.__queue__.push(async function test_not_status_step() {
      let val = unfunc(value);

      debug(`test.not.status(${val})`);

      message = message || `test.not.status(${val}) failed`;

      assert.notStrictEqual(this.__response__.status, val, message);
    });
    return this;
  }
]);


// Check header equals to value
//
functions.push([
  [ 'test.header' ],
  function test_header(name, value, message) {
    this.__queue__.push(async function test_header_step() {
      let headerName = unfunc(name);
      let val = unfunc(value);

      debug(`test.header('${headerName}', '${val}')`);

      let header = (this.__response__.headers || []).find(
        header => header.name.toLowerCase() === headerName.toLowerCase()
      );

      message = message || `test.header('${headerName}', '${val}') failed (got '${(header || {}).value}')`;

      if (!header) {
        throw new NavitError(`test.header('${headerName}', '${val}') failed - header not found`);
      }

      assertFlex(header.value, val, message);
    });

    return this;
  }
]);


// Check header equals to value
//
functions.push([
  [ 'test.not.header', 'test.header.not' ],
  function test_not_header(name, value, message) {
    this.__queue__.push(async function test_not_header_step() {
      let headerName = unfunc(name);
      let val = unfunc(value);

      debug(`test.not.header('${headerName}', '${val})`);

      message = message || `test.not.header('${headerName}', '${val}') failed`;

      let header = (this.__response__.headers || []).find(
        header => header.name.toLowerCase() === headerName.toLowerCase()
      );

      if (!header) {
        throw new NavitError(`test.not.header('${headerName}', '${val}') failed - header not found`);
      }

      assertNotFlex(header.value, val, message);
    });

    return this;
  }
]);


// Sugar for `status`, `body` and `header`
//
functions.push([
  [ 'test' ],
  function test(/*args...[, message]*/) {
    // Status check
    if (Number.isFinite(arguments[0])) {
      return this.test.status(arguments[0], arguments[1]);
    }

    // Header check
    if (typeof arguments[0] === 'string' && typeof arguments[1] === 'string') {
      return this.test.header(arguments[0], arguments[1], arguments[2]);
    }

    // Request body check
    return this.test.body(arguments[0], arguments[1]);
  }
]);


// Sugar for `status.not`, `body.not` and `header.not`
//
functions.push([
  [ 'test.not' ],
  function test_not(/*args...[, message]*/) {
    // Status check
    if (Number.isFinite(arguments[0])) {
      return this.test.status.not(arguments[0], arguments[1]);
    }

    // Header check
    if (typeof arguments[0] === 'string' && typeof arguments[1] === 'string') {
      return this.test.header.not(arguments[0], arguments[1], arguments[2]);
    }

    // Request body check
    return this.test.body.not(arguments[0], arguments[1]);
  }
]);


// Check element value equal to value
//
functions.push([
  [ 'test.value' ],
  function test_value(selector, value, message) {
    this.__queue__.push(async function test_value_step() {
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.value('${sel}', ${val})`);

      message = message || `test.value('${sel}', ${val}) failed`;

      let result = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.value };
      }, sel);

      if (!result.exists) {
        throw new NavitError(`test.value('${sel}', ${val}) failed - selector not found`);
      }

      assertFlex(result.value, val, message);
    });

    return this;
  }
]);


// Check element value not equal to value
//
functions.push([
  [ 'test.value.not', 'test.not.value' ],
  function test_not_value(selector, value, message) {
    this.__queue__.push(async function test_not_value_step() {
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.not.value('${sel}', ${val})`);

      message = message || `test.not.value('${sel}', ${val}) failed`;

      let result = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.value };
      }, sel);

      if (!result.exists) {
        throw new NavitError(`test.not.value('${sel}', ${val}) failed - selector not found`);
      }

      assertNotFlex(result.value, val, message);
    });

    return this;
  }
]);


module.exports = functions;
