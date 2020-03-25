'use strict';


const debug      = require('debug')('navit');
const _          = require('lodash');
const NavitError = require('../error');
const unfunc     = require('../utils').unfunc;


let functions = [];

// Poll interval for `wait.*` functions
const POLL_INTERVAL = 50;


// Waiting
//
functions.push([
  [ 'wait', 'do.wait' ],
  function do_wait(param, timeout) {
    let self = this;
    let time;
    let params;

    // `.wait(fn [, params..., timeout])`
    if (_.isFunction(param)) {
      params = Array.prototype.slice.call(arguments, 1, param.length + 1);
      timeout = arguments.length > param.length + 1 ? arguments[param.length + 1] : null;
    }

    async function selectorCheck() {
      for (;;) {
        let result = await self.__page__.evaluate(function (selector) {
          return document.querySelectorAll(selector).length;
        }, param);

        // TODO: we should cast result to number in case of
        // https://github.com/baudehlo/node-phantom-simple/issues/43
        result = +result;

        // If selector is on page - done
        if (result > 0) return;

        // If timeout exceeded - return error
        let tout = timeout || self.__options__.timeout;
        if (Date.now() - time > (tout)) {
          throw new NavitError(`do.wait: timed out [${tout}ms]`);
        }

        // Retry after delay
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      }
    }

    async function fnCheck() {
      for (;;) {
        let result = await self.__page__.evaluate.apply(self.__page__,
          [ param ].concat(params.map(param => unfunc(param))));

        // If `fn` return `true` - done
        if (result) return;

        // If timeout exceeded - return error
        let tout = timeout || self.__options__.timeout;
        if (Date.now() - time > (tout)) {
          throw new NavitError(`do.wait: timed out [${tout}ms]`);
        }

        // Retry after delay
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      }
    }

    this.__queue__.push(async function do_wait_step() {
      // `.wait(delay)`
      if (_.isNumber(param)) {
        debug(`do.wait('${param}')`);
        await new Promise(resolve => setTimeout(resolve, param));

      // `.wait(selector [, timeout])` - wait for selector to appear
      } else if (_.isString(param)) {
        if (typeof timeout !== 'undefined') debug(`do.wait('${param}', ${timeout})`);
        else debug(`do.wait('${param}')`);

        time = +Date.now();
        await selectorCheck();

      // `.wait(fn [, params..., timeout])` - wait while function not return true
      } else if (_.isFunction(param)) {
        debug('do.wait(function)');
        time = +Date.now();
        await fnCheck();

      // `.wait()`
      } else {
        debug('do.wait()');
        time = +Date.now();
        await self.__pageWait__(timeout);
      }
    });

    return this;
  }
]);


// Click
//
functions.push([
  [ 'click', 'do.click' ],
  function do_click(selector) {
    this.__queue__.push(async function do_click_step() {
      let sel = unfunc(selector);

      debug(`do.click('${sel}')`);

      let exists = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        if (!element) return false;

        element.click();
        return true;
      }, sel);

      if (!exists) {
        throw new NavitError(`do.click('${sel}') failed - selector not found`);
      }
    });

    return this;
  }
]);


// Select
//
functions.push([
  [ 'select', 'do.select' ],
  function do_select(selector, option) {
    this.__queue__.push(async function do_select_step() {
      let sel = unfunc(selector);

      debug(`do.select('${sel}')`);

      let exists = await this.__page__.evaluate(function (selector, option) {
        let element = document.querySelector(selector);

        if (!element) return false;

        element.value = option;

        // Fire change event

        let event = document.createEvent('HTMLEvents');
        event.initEvent('change', true, true);
        element.dispatchEvent(event);

        return true;
      }, sel, unfunc(option));

      if (!exists) {
        throw new NavitError(`do.select('${sel}') failed - selector not found`);
      }
    });

    return this;
  }
]);


// Check
//
functions.push([
  [ 'check', 'do.check' ],
  function do_check(selector) {
    this.__queue__.push(async function do_check_step() {
      let sel = unfunc(selector);

      debug(`do.check('${sel}')`);

      let exists = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        if (!element) return false;

        element.checked = !element.checked;

        // Fire change event

        let event = document.createEvent('HTMLEvents');
        event.initEvent('change', true, true);
        element.dispatchEvent(event);

        return true;
      }, sel);

      if (!exists) {
        throw new NavitError(`do.select('${sel}') failed - selector not found`);
      }
    });

    return this;
  }
]);


// Scroll to
//
functions.push([
  [ 'scrollTo', 'do.scrollTo' ],
  function do_scroll_to(x, y) {
    this.__queue__.push(async function do_scroll_to_step() {
      let sx = unfunc(x);
      let sy = unfunc(y);

      debug(`do.scrollTo(${sx}, ${sy})`);

      await this.__page__.evaluate(function (x, y) {
        window.scrollTo(x, y);
      }, sx, sy);
    });

    return this;
  }
]);


// Fill out a form
//
functions.push([
  [ 'fill', 'do.fill' ],
  function do_fill(selector, values, submit) {
    this.__queue__.push(async function do_fill_step() {
      let sel = unfunc(selector);

      debug(`do.fill('${sel}')`);

      let result = await this.__page__.evaluate(function (args) {
        let form = document.querySelector(args.selector);

        if (!form) return 'selector not found';

        let error;

        Object.keys(args.values).forEach(function (key) {
          if (error) return;

          let item = form[key];
          let value = args.values[key];

          if (!(item instanceof window.HTMLElement)) {
            return 'input field "' + key + '" not found';
          }

          switch (item.nodeName.toLowerCase()) {
            case 'input':
              switch (item.getAttribute('type') || 'text') {
                case 'file':
                  error = "can't use fill() with file inputs";
                  break;

                case 'checkbox':
                case 'radio':
                  item.checked = value ? true : false;
                  break;

                default:
                  item.value = value;
                  break;
              }

              break;

            case 'select':
              if (value === '') {
                item.selectedIndex = -1;
              } else {
                item.value = value;
              }

              if (item.value !== value) {
                [].some.call(item.options, function (option) {
                  option.selected = (value === option.text);

                  return value === option.text;
                });
              }

              break;

            case 'textarea':
              item.value = value;
              break;

            default:
              error = 'unsupported field type';
              break;
          }
        });

        if (args.submit) {
          form.submit();
        }

        return error;
      }, { selector: sel, values: unfunc(values), submit: unfunc(submit) });

      if (result) {
        throw new NavitError(`do.fill('${sel}') failed - ${result}`);
      }
    });

    return this;
  }
]);


// Clear
//
functions.push([
  [ 'clear', 'do.clear' ],
  function do_clear(selector) {
    this.__queue__.push(async function do_clear_step() {
      let sel = unfunc(selector);

      debug(`do.clear('${sel}')`);

      let exists = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        if (!element) return false;

        if (typeof element.value !== 'undefined') element.value = '';

        if (element.contentEditable === 'true') {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
        }

        return true;
      }, sel);

      if (!exists) {
        throw new NavitError(`do.clear('${sel}') failed - selector not found`);
      }
    });

    return this;
  }
]);


module.exports = functions;
