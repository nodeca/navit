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

      this.__page__.get('title', function (err, title) {
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

      this.__page__.get('title', function (err, title) {
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

      this.__page__.get('url', function (err, url) {
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

      this.__page__.get('url', function (err, url) {
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


// Check element attribute equal to value
//
functions.push([
  [ 'test.attribute' ],
  function test_attribute(selector, attribute, value, message) {
    this.__queue__.push(function test_attribute_step(callback) {
      var sel = _.isFunction(selector) ? selector() : selector;
      var attr = _.isFunction(attribute) ? attribute() : attribute;

      debug(format("test.attribute('%s', '%s')", sel, attr));

      message = message || format("test.attribute('%s', '%s') failed", sel, attr);

      this.__page__.evaluate(function (selector, attribute) {
        var element = document.querySelector(selector);

        if (!element) {
          return { exists: false };
        }

        return { exists: true, value: element.getAttribute(attribute) };
      }, sel, attr, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (!result.exists) {
          callback(new NavitError(format("test.attribute('%s', '%s') failed - selector not found", sel, attr)));
          return;
        }

        assertFlex(result.value, value, message, callback);
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
      var sel = _.isFunction(selector) ? selector() : selector;
      var attr = _.isFunction(attribute) ? attribute() : attribute;

      debug(format("test.not.attribute('%s', '%s')", sel, attr));

      message = message || format("test.not.attribute('%s', '%s') failed", sel, attr);

      this.__page__.evaluate(function (selector, attribute) {
        var element = document.querySelector(selector);

        if (!element) {
          return { exists: false };
        }

        return { exists: true, value: element.getAttribute(attribute) };
      }, sel, attr, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (!result.exists) {
          callback(new NavitError(format("test.not.attribute('%s', '%s') failed - selector not found", sel, attr)));
          return;
        }

        assertNotFlex(result.value, value, message, callback);
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
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("test.exists('%s')", sel));

      message = message || format("test.exists('%s') failed", sel);

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, function (err, count) {
        if (err) {
          callback(err);
          return;
        }

        // TODO: we should cast result to number in case of
        // https://github.com/baudehlo/node-phantom-simple/issues/43
        count = +count;

        check(function () {
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
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("test.not.exists('%s')", sel));

      message = message || format("test.not.exists('%s') failed", sel);

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        // TODO: we should cast result to number in case of
        // https://github.com/baudehlo/node-phantom-simple/issues/43
        result = +result;

        check(function () {
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
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("test.visible('%s')", sel));

      message = message || format("test.visible('%s') failed", sel);

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
      }, sel, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (!result.exists) {
          callback(new NavitError(format("test.visible('%s') failed - selector not found", sel)));
          return;
        }

        check(function () {
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
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("test.not.visible('%s')", sel));

      message = message || format("test.not.visible('%s') failed", sel);

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
      }, sel, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (!result.exists) {
          callback(new NavitError(format("test.not.visible('%s') failed - selector not found", sel)));
          return;
        }

        check(function () {
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
    var self = this;

    this.__queue__.push(function test_status_step(callback) {
      debug('test.status()');

      message = message || 'test.status() failed';

      check(function () {
        assert.strictEqual(self.__response__.status, _.isFunction(value) ? value() : value, message);
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
    var self = this;

    this.__queue__.push(function test_not_status_step(callback) {
      debug('test.not.status()');

      message = message || 'test.not.status() failed';

      check(function () {
        assert.notStrictEqual(self.__response__.status, _.isFunction(value) ? value() : value, message);
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
      var headerName = _.isFunction(name) ? name() : name;

      debug(format("test.header('%s')", headerName));

      message = message || format("test.header('%s') failed", headerName);

      var header = _.find(this.__response__.headers, function (header) {
        return header.name === headerName;
      });

      if (!header) {
        callback(new NavitError(format("test.header('%s') failed - header not found", headerName)));
        return;
      }

      assertFlex(header.value, value, message, callback);
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
      var headerName = _.isFunction(name) ? name() : name;

      debug(format("test.not.header('%s')", headerName));

      message = message || format("test.not.header('%s') failed", headerName);

      var header = _.find(this.__response__.headers, function (header) {
        return header.name === headerName;
      });

      if (!header) {
        callback(new NavitError(format("'test.not.header(%s)' failed - header not found", headerName)));
        return;
      }

      assertNotFlex(header.value, value, message, callback);
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
      debug('test.body()');

      message = message || 'test.body() failed';

      this.__page__.get('content', function (err, content) {
        if (err) {
          callback(err);
          return;
        }

        assertFlex(content, value, message, callback);
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
      debug('test.not.body()');

      message = message || 'test.not.body() failed';

      this.__page__.get('content', function (err, content) {
        if (err) {
          callback(err);
          return;
        }

        assertNotFlex(content, value, message, callback);
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
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("test.value('%s')", sel));

      message = message || format("test.value('%s') failed", sel);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) {
          return { exists: false };
        }

        return { exists: true, value: element.value };
      }, sel, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (!result.exists) {
          callback(new NavitError(format("test.value('%s') failed - selector not found", sel)));
          return;
        }

        assertFlex(result.value, value, message, callback);
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
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("test.not.value('%s')", sel));

      message = message || format("test.not.value('%s') failed", sel);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) {
          return { exists: false };
        }

        return { exists: true, value: element.value };
      }, sel, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (!result.exists) {
          callback(new NavitError(format("test.not.value('%s') failed - selector not found", sel)));
          return;
        }

        assertNotFlex(result.value, value, message, callback);
      });
    });

    return this;
  }
]);


module.exports = functions;
