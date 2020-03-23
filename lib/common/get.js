'use strict';


const debug      = require('debug')('navit');
const NavitError = require('../error');
const finalize   = require('../utils').finalize;
const unfunc     = require('../utils').unfunc;


let functions = [];


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
