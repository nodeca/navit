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
// - value (String|Function|RegExp) - string to check equal with result, function
//   for lazy value get or regexp to test
// - message (String) - assertion message
//
function assertFlex(result, value, message, callback) {
  check(() => {
    if (_.isRegExp(value)) {
      assert.match(result, value, message);
    } else {
      assert.strictEqual(result, value, message);
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
  check(() => {
    if (_.isRegExp(value)) {
      assert.notMatch(result, value, message);
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
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (result.text === false) {
          callback(new NavitError(`test.text('${sel}', '${val}) failed - selector not found`));
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

      debug(`test.not.text('${sel}', '${val}')`);

      message = message || `test.not.text('${sel}', '${val}') failed`;

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (result.text === false) {
          callback(new NavitError(`test.not.text('${sel}', '${val}) failed - selector not found`));
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

      this.__page__.evaluate.apply(this.__page__, [ fn ].concat(params).concat([ (err, result) => {
        if (err) return callback(err);

        check(() => {
          message = message || `test.evaluate() should return true, instead of ${result}`;

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

      this.__page__.get('title', (err, title) => {
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

      this.__page__.get('title', (err, title) => {
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

      this.__page__.get('url', (err, url) => {
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

      this.__page__.get('url', (err, url) => {
        if (err) return callback(err);

        assertNotFlex(url, val, message, callback);
      });
    });

    return this;
  }
]);


// Check element attribute equal to value
//
functions.push([
  [ 'test.attribute' ],
  function test_attribute(selector, attribute, value, message) {
    this.__queue__.push(function test_attribute_step(callback) {
      let sel  = unfunc(selector);
      let attr = unfunc(attribute);
      let val  = unfunc(value);

      debug(`test.attribute('${sel}', '${attr}', '${val}')`);

      message = message || `test.attribute('${sel}', '${attr}', '${val}') failed`;

      this.__page__.evaluate(function (selector, attribute) {
        var element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.getAttribute(attribute) };
      }, sel, attr, (err, result) => {
        if (err) return callback(err);

        if (!result.exists) {
          callback(new NavitError(`test.attribute('${sel}', '${attr}', '${val}') failed - selector not found`));
          return;
        }

        assertFlex(result.value, val, message, callback);
      });
    });

    return this;
  }
]);


// Check element attribute not equal to value
//
functions.push([
  [ 'test.attribute.not', 'test.not.attribute' ],
  function test_not_attribute(selector, attribute, value, message) {
    this.__queue__.push(function test_not_attribute_step(callback) {
      let sel  = unfunc(selector);
      let attr = unfunc(attribute);
      let val  = unfunc(value);

      debug(`test.not.attribute('${sel}', '${attr}', '${val}')`);

      message = message || `test.not.attribute('${sel}', '${attr}', '${val}') failed`;

      this.__page__.evaluate(function (selector, attribute) {
        var element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.getAttribute(attribute) };
      }, sel, attr, (err, result) => {
        if (err) return callback(err);

        if (!result.exists) {
          callback(new NavitError(`test.not.attribute('${sel}', '${attr}', '${val}') failed - selector not found`));
          return;
        }

        assertNotFlex(result.value, val, message, callback);
      });
    });

    return this;
  }
]);


// Check element exists
//
functions.push([
  [ 'test.exists' ],
  function test_exists(selector, message) {
    this.__queue__.push(function test_exists_step(callback) {
      let sel = unfunc(selector);

      debug(`test.exists('${sel}')`);

      message = message || `test.exists('${sel}') failed`;

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, (err, count) => {
        if (err) return callback(err);

        // TODO: we should cast result to number in case of
        // https://github.com/baudehlo/node-phantom-simple/issues/43
        count = +count;

        check(() => {
          assert.equal(count > 0, true, message);
        }, callback);
      });
    });

    return this;
  }
]);


// Check element not exists
//
functions.push([
  [ 'test.not.exists', 'test.exists.not' ],
  function test_not_exists(selector, message) {
    this.__queue__.push(function test_not_exists_step(callback) {
      let sel = unfunc(selector);

      debug(`test.not.exists('${sel}')`);

      message = message || `test.not.exists('${sel}') failed`;

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, (err, result) => {
        if (err) return callback(err);

        // TODO: we should cast result to number in case of
        // https://github.com/baudehlo/node-phantom-simple/issues/43
        result = +result;

        check(() => {
          assert.equal(result === 0, true, message);
        }, callback);
      });
    });

    return this;
  }
]);


// Check element visible
//
functions.push([
  [ 'test.visible' ],
  function test_visible(selector, message) {
    this.__queue__.push(function test_visible_step(callback) {
      let sel = unfunc(selector);

      debug(`test.visible('${sel}')`);

      message = message || `test.visible('${sel}') failed`;

      this.__page__.evaluate(function (selector) {
        var elem = document.querySelector(selector);

        if (!elem) return { exists: false };

        var style = window.getComputedStyle(elem);

        return {
          exists: true,
          // http://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
          visible: elem.offsetParent !== null || (style.display !== 'none' && style.position === 'fixed')
        };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (!result.exists) {
          callback(new NavitError(`test.visible('${sel}') failed - selector not found`));
          return;
        }

        check(() => {
          assert.equal(result.visible, true, message);
        }, callback);
      });
    });

    return this;
  }
]);


// Check element not visible
//
functions.push([
  [ 'test.not.visible', 'test.visible.not' ],
  function test_not_visible(selector, message) {
    this.__queue__.push(function test_not_visible_step(callback) {
      let sel = unfunc(selector);

      debug(`test.not.visible('${sel}')`);

      message = message || `test.not.visible('${sel}') failed`;

      this.__page__.evaluate(function (selector) {
        var elem = document.querySelector(selector);

        if (!elem) {
          return { exists: false };
        }

        var style = window.getComputedStyle(elem);

        return {
          exists: true,
          // http://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
          visible: elem.offsetParent !== null || (style.display !== 'none' && style.position === 'fixed')
        };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (!result.exists) {
          callback(new NavitError(`test.not.visible('${sel}') failed - selector not found`));
          return;
        }

        check(() => {
          assert.equal(result.visible, false, message);
        }, callback);
      });
    });

    return this;
  }
]);


// Check status equals to value
//
functions.push([
  [ 'test.status' ],
  function test_status(value, message) {
    this.__queue__.push(function test_status_step(callback) {
      let val = unfunc(value);

      debug(`test.status(${val})`);

      message = message || `test.status(${val}) failed`;

      check(() => {
        assert.strictEqual(this.__response__.status, val, message);
      }, callback);
    });

    return this;
  }
]);


// Check status not equals to value
//
functions.push([
  [ 'test.not.status', 'test.status.not' ],
  function test_not_status(value, message) {
    this.__queue__.push(function test_not_status_step(callback) {
      let val = unfunc(value);

      debug(`test.not.status(${val})`);

      message = message || `test.not.status(${val}) failed`;

      check(() => {
        assert.notStrictEqual(this.__response__.status, val, message);
      }, callback);
    });
    return this;
  }
]);


// Check header equals to value
//
functions.push([
  [ 'test.header' ],
  function test_header(name, value, message) {
    this.__queue__.push(function test_header_step(callback) {
      let headerName = unfunc(name);
      let val = unfunc(value);

      debug(`test.header('${headerName}', '${val}')`);

      message = message || `test.header('${headerName}', '${val}') failed`;

      let header = _.find(this.__response__.headers,
        header => header.name.toLowerCase() === headerName.toLowerCase());

      if (!header) {
        callback(new NavitError(`test.header('${headerName}', '${val}') failed - header not found`));
        return;
      }

      assertFlex(header.value, val, message, callback);
    });

    return this;
  }
]);


// Check header equals to value
//
functions.push([
  [ 'test.not.header', 'test.header.not' ],
  function test_not_header(name, value, message) {
    this.__queue__.push(function test_not_header_step(callback) {
      let headerName = unfunc(name);
      let val = unfunc(value);

      debug(`test.not.header('${headerName}', '${val})`);

      message = message || `test.not.header('${headerName}', '${val}') failed`;

      let header = _.find(this.__response__.headers,
        header => header.name.toLowerCase() === headerName.toLowerCase());

      if (!header) {
        callback(new NavitError(`test.not.header('${headerName}', '${val}') failed - header not found`));
        return;
      }

      assertNotFlex(header.value, val, message, callback);
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

      this.__page__.get('content', (err, content) => {
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

      this.__page__.get('content', (err, content) => {
        if (err) return callback(err);

        assertNotFlex(content, val, message, callback);
      });
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
    if (_.isNumber(arguments[0])) {
      return this.test.status(arguments[0], arguments[1]);
    }

    // Header check
    if (_.isString(arguments[0]) && _.isString(arguments[1])) {
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
    if (_.isNumber(arguments[0])) {
      return this.test.status.not(arguments[0], arguments[1]);
    }

    // Header check
    if (_.isString(arguments[0]) && _.isString(arguments[1])) {
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
    this.__queue__.push(function test_value_step(callback) {
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.value('${sel}', ${val})`);

      message = message || `test.value('${sel}', ${val}) failed`;

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.value };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (!result.exists) {
          callback(new NavitError(`test.value('${sel}', ${val}) failed - selector not found`));
          return;
        }

        assertFlex(result.value, val, message, callback);
      });
    });

    return this;
  }
]);


// Check element value not equal to value
//
functions.push([
  [ 'test.value.not', 'test.not.value' ],
  function test_not_value(selector, value, message) {
    this.__queue__.push(function test_not_value_step(callback) {
      let sel = unfunc(selector);
      let val = unfunc(value);

      debug(`test.not.value('${sel}', ${val})`);

      message = message || `test.not.value('${sel}', ${val}) failed`;

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.value };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (!result.exists) {
          callback(new NavitError(`test.not.value('${sel}', ${val}) failed - selector not found`));
          return;
        }

        assertNotFlex(result.value, val, message, callback);
      });
    });

    return this;
  }
]);


module.exports = functions;
