'use strict';


const debug      = require('debug')('navit');
const NavitError = require('../error');
const finalize   = require('../utils').finalize;
const unfunc     = require('../utils').unfunc;


let functions = [];


// Get page title
//
functions.push([
  [ 'title', 'get.title' ],
  function get_title(fn) {
    this.__queue__.push(function get_title_step(callback) {
      debug('get.title()');

      this.__page__.get('title', (err, title) => {
        if (err) return callback(err);

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
      debug('get.url()');

      this.__page__.get('url', (err, url) => {
        if (err) return callback(err);

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
      var sel = unfunc(selector);

      debug(`get.count('${sel}')`);

      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel, (err, count) => {
        if (err) return callback(err);

        finalize(fn, count, callback);
      });
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
      var sel = unfunc(selector);

      debug(`get.text('${sel}')`);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (result.text === false) {
          callback(new NavitError(`get.text('${sel}') failed - selector not found`));
          return;
        }

        finalize(fn, result.text, callback);
      });
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

        debug('get.body()');

        this.__page__.get('content', (err, html) => {
          if (err) return callback(err);

          finalize(fn, html, callback);
        });
        return;
      }

      let sel = unfunc(selector);

      debug(`get.html('${sel}')`);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { html: element ? element.innerHTML : false };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (result.html === false) {
          callback(new NavitError(`get.html('${sel}') failed - selector not found`));
          return;
        }

        finalize(fn, result.html, callback);
      });
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
      var sel = unfunc(selector);

      debug(`get.attribute('${sel}')`);

      this.__page__.evaluate(function (selector, attribute) {
        var element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.getAttribute(attribute) };
      }, sel, unfunc(attribute), (err, result) => {
        if (err) return callback(err);

        if (!result.exists) {
          callback(new NavitError(`get.attribute('${sel}') failed - selector not found`));
          return;
        }

        finalize(fn, result.value, callback);
      });
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
      debug('get.cookies()');

      this.__page__.get('cookies', (err, cookies) => {
        if (err) return callback(err);

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
    let params = Array.prototype.slice.call(arguments, 1, clientFn.length + 1);
    let fn;

    if (params.length < arguments.length - 1) {
      fn = arguments[arguments.length - 1];
    }

    debug('get.evaluate()');

    this.__queue__.push(function get_evaluate_step(callback) {
      this.__page__.evaluate.apply(this.__page__, [ clientFn ].concat(params).concat([ (err, result) => {
        if (err) return callback(err);

        if (fn) {
          finalize(fn, result, callback);
          return;
        }

        callback();
      } ]));
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
      debug('get.status()');

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
      debug('get.headers()');

      finalize(fn, this.__response__.headers, callback);
    });

    return this;
  }
]);


// Get value
//
functions.push([
  [ 'value', 'get.value' ],
  function get_value(selector, fn) {
    this.__queue__.push(function get_value_step(callback) {
      var sel = unfunc(selector);

      debug(`get.value('${sel}')`);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.value };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (!result.exists) {
          callback(new NavitError(`get.value('${sel}') failed - selector not found`));
          return;
        }

        finalize(fn, result.value, callback);
      });
    });

    return this;
  }
]);


module.exports = functions;
