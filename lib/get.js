'use strict';


var format     = require('util').format;
var _          = require('lodash');
var NavitError = require('./error');


var functions = [];


// Return result to user, depending on param type in signature
//
function finalize(fn, result, callback) {
  // If `fn` is array - push result
  if (_.isArray(fn)) {
    fn.push(result);
    callback();
    return;
  }

  if (!_.isFunction(fn) || (fn.length !== 1 && fn.length !== 2)) {
    callback(new NavitError("'fn' param should be a function with one or two arguments"));
    return;
  }

  // If `fn` sync
  if (fn.length === 1) {
    callback(fn(result));
    return;
  }

  // If `fn` async
  fn(result, callback);
}



// Get page title
//
functions.push([
  [ 'title', 'get.title' ],
  function get_title(fn) {
    this.__queue__.push(function get_title_step(callback) {
      this.__page__.get('title', function (err, title) {
        if (err) {
          callback(err);
          return;
        }

        finalize(fn, title, callback);
      });
    });

    return this;
  }
]);


// Get current page url
//
functions.push([
  [ 'url', 'get.url' ],
  function get_url(fn) {
    this.__queue__.push(function get_url_step(callback) {
      this.__page__.get('url', function (err, url) {
        if (err) {
          callback(err);
          return;
        }

        finalize(fn, url, callback);
      });
    });

    return this;
  }
]);


// Get elements count
//
functions.push([
  [ 'count', 'get.count' ],
  function get_count(selector, fn) {
    this.__queue__.push(function get_count_step(callback) {
      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, function (err, count) {
        if (err) {
          callback(err);
          return;
        }

        finalize(fn, count, callback);
      }, _.isFunction(selector) ? selector() : selector);
    });

    return this;
  }
]);


// Get element text
//
functions.push([
  [ 'text', 'get.text' ],
  function get_text(selector, fn) {
    this.__queue__.push(function get_text_step(callback) {
      var sel = _.isFunction(selector) ? selector() : selector;

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { text: element ? element.innerText : false };
      }, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (result.text === false) {
          callback(new NavitError(format("get.text('%s') failed - selector not found", sel)));
          return;
        }

        finalize(fn, result.text, callback);
      }, sel);
    });

    return this;
  }
]);


// Get element html
//
functions.push([
  [ 'html', 'get.html', 'get.body' ],
  function get_html(selector, fn) {
    if (!fn) {
      fn = selector;
      selector = null;
    }

    this.__queue__.push(function get_html_step(callback) {
      if (!selector) {
        this.__page__.get('content', function (err, html) {
          if (err) {
            callback(err);
            return;
          }

          finalize(fn, html, callback);
        });
        return;
      }

      var sel = _.isFunction(selector) ? selector() : selector;

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { html: element ? element.innerHTML : false };
      }, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (result.html === false) {
          callback(new NavitError(format("get.html('%s') failed - selector not found", sel)));
          return;
        }

        finalize(fn, result.html, callback);
      }, sel);
    });

    return this;
  }
]);


// Get element attribute
//
functions.push([
  [ 'attribute', 'get.attribute' ],
  function get_attribute(selector, attribute, fn) {
    this.__queue__.push(function get_attribute_step(callback) {
      var sel = _.isFunction(selector) ? selector() : selector;

      this.__page__.evaluate(function (selector, attribute) {
        var element = document.querySelector(selector);

        if (!element) {
          return { exists: false };
        }

        return { exists: true, value: element.getAttribute(attribute) };
      }, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (!result.exists) {

          callback(new NavitError(format("get.attribute('%s') failed - selector not found", sel)));
          return;
        }

        finalize(fn, result.value, callback);
      }, sel, _.isFunction(attribute) ? attribute() : attribute);
    });

    return this;
  }
]);


// Get cookies
//
functions.push([
  [ 'get.cookies' ],
  function get_cookies(fn) {
    this.__queue__.push(function get_cookies_step(callback) {
      this.__page__.get('cookies', function (err, cookies) {
        if (err) {
          callback(err);
          return;
        }

        finalize(fn, cookies, callback);
      });
    });

    return this;
  }
]);


// Evaluate
//
functions.push([
  [ 'get.evaluate' ],
  function get_evaluate(clientFn /*[, params, fn]*/) {
    var fn = arguments[arguments.length - 1];
    var params = Array.prototype.slice.call(arguments, 1, arguments.length - 1);

    this.__queue__.push(function get_evaluate_step(callback) {
      this.__page__.evaluate.apply(this.__page__, [ clientFn, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        finalize(fn, result, callback);
      } ].concat(params));
    });

    return this;
  }
]);


// Get status
//
functions.push([
  [ 'get.status' ],
  function get_status(fn) {
    this.__queue__.push(function get_status_step(callback) {
      finalize(fn, this.__response__.status, callback);
    });

    return this;
  }
]);


// Get headers
//
functions.push([
  [ 'get.headers' ],
  function get_headers(fn) {
    this.__queue__.push(function get_headers_step(callback) {
      finalize(fn, this.__response__.headers, callback);
    });

    return this;
  }
]);


module.exports = functions;
