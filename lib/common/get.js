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
    this.__queue__.push(async function get_count_step() {
      let sel = unfunc(selector);

      debug(`get.count('${sel}')`);

      let count = await this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, sel);

      await finalize(fn, count);
    });

    return this;
  }
]);


// Get element text
//
functions.push([
  [ 'text', 'get.text' ],
  function get_text(selector, fn) {
    this.__queue__.push(async function get_text_step() {
      let sel = unfunc(selector);

      debug(`get.text('${sel}')`);

      let result = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        return { text: element ? element.textContent || element.innerText : false };
      }, sel);

      if (result.text === false) {
        throw new NavitError(`get.text('${sel}') failed - selector not found`);
      }

      await finalize(fn, result.text);
    });

    return this;
  }
]);


// Get element attribute
//
functions.push([
  [ 'attribute', 'get.attribute' ],
  function get_attribute(selector, attribute, fn) {
    this.__queue__.push(async function get_attribute_step() {
      let sel = unfunc(selector);

      debug(`get.attribute('${sel}')`);

      let result = await this.__page__.evaluate(function (selector, attribute) {
        let element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.getAttribute(attribute) };
      }, sel, unfunc(attribute));

      if (!result.exists) {
        throw new NavitError(`get.attribute('${sel}') failed - selector not found`);
      }

      await finalize(fn, result.value);
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

    this.__queue__.push(async function get_evaluate_step() {
      let result = await this.__page__.evaluate.apply(this.__page__, [ clientFn ].concat(params));

      if (fn) await finalize(fn, result);
    });

    return this;
  }
]);


// Get status
//
functions.push([
  [ 'get.status' ],
  function get_status(fn) {
    this.__queue__.push(async function get_status_step() {
      debug('get.status()');

      await finalize(fn, this.__response__.status);
    });

    return this;
  }
]);


// Get headers
//
functions.push([
  [ 'get.headers' ],
  function get_headers(fn) {
    this.__queue__.push(async function get_headers_step() {
      debug('get.headers()');

      await finalize(fn, this.__response__.headers);
    });

    return this;
  }
]);


// Get value
//
functions.push([
  [ 'value', 'get.value' ],
  function get_value(selector, fn) {
    this.__queue__.push(async function get_value_step() {
      let sel = unfunc(selector);

      debug(`get.value('${sel}')`);

      let result = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        if (!element) return { exists: false };

        return { exists: true, value: element.value };
      }, sel);

      if (!result.exists) {
        throw new NavitError(`get.value('${sel}') failed - selector not found`);
      }

      await finalize(fn, result.value);
    });

    return this;
  }
]);


module.exports = functions;
