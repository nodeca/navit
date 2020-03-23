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

    function selectorCheck(callback) {
      self.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, param, (err, result) => {
        if (err) return callback(err);

        // TODO: we should cast result to number in case of
        // https://github.com/baudehlo/node-phantom-simple/issues/43
        result = +result;

        // If selector is on page - done
        if (result > 0) {
          callback();
          return;
        }

        // If timeout exceeded - return error
        let tout = timeout || self.__options__.timeout;
        if (Date.now() - time > (tout)) {
          callback(new NavitError(`do.wait: timed out [${tout}ms]`));
          return;
        }

        // Retry after delay
        setTimeout(() => selectorCheck.call(this, callback), POLL_INTERVAL);
      });
    }

    function fnCheck(callback) {

      self.__page__.evaluate.apply(self.__page__,
        [ param ].concat(params.map(param => unfunc(param)))
          .concat([ (err, result) => {
            if (err) return callback(err);

            // If `fn` return `true` - done
            if (result) {
              callback();
              return;
            }

            // If timeout exceeded - return error
            let tout = timeout || self.__options__.timeout;
            if (Date.now() - time > (tout)) {
              callback(new NavitError(`do.wait: timed out [${tout}ms]`));
              return;
            }

            // Retry after delay
            setTimeout(() => fnCheck.call(self, callback), POLL_INTERVAL);
          } ])
      );
    }

    this.__queue__.push(function do_wait_step(callback) {
      // `.wait(delay)`
      if (_.isNumber(param)) {
        debug(`do.wait('${param}')`);
        setTimeout(callback, param);

      // `.wait(selector [, timeout])` - wait for selector appear
      } else if (_.isString(param)) {
        if (typeof timeout !== 'undefined') debug(`do.wait('${param}', ${timeout})`);
        else debug(`do.wait('${param}')`);

        time = +Date.now();
        selectorCheck(callback);

      // `.wait(fn [, params..., timeout])` - wait while function not return true
      } else if (_.isFunction(param)) {
        debug('do.wait(function)');
        time = +Date.now();
        fnCheck(callback);

      // `.wait()`
      } else {
        debug('do.wait()');
        time = +Date.now();
        self.__pageWait__(timeout, null, callback);
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
    this.__queue__.push(function do_click_step(callback) {
      let sel = unfunc(selector);

      debug(`do.click('${sel}')`);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) return false;

        element.click();
        return true;
      }, sel, (err, exists) => {
        if (err) return callback(err);

        if (!exists) {
          callback(new NavitError(`do.click('${sel}') failed - selector not found`));
          return;
        }

        callback();
      });
    });

    return this;
  }
]);


// Select
//
functions.push([
  [ 'select', 'do.select' ],
  function do_select(selector, option) {
    this.__queue__.push(function do_select_step(callback) {
      let sel = unfunc(selector);

      debug(`do.select('${sel}')`);

      this.__page__.evaluate(function (selector, option) {
        var element = document.querySelector(selector);

        if (!element) return false;

        element.value = option;

        // Fire change event

        var event = document.createEvent('HTMLEvents');
        event.initEvent('change', true, true);
        element.dispatchEvent(event);

        return true;
      }, sel, unfunc(option), (err, exists) => {
        if (err) return callback(err);

        if (!exists) {
          callback(new NavitError(`do.select('${sel}') failed - selector not found`));
          return;
        }

        callback();
      });
    });

    return this;
  }
]);


// Check
//
functions.push([
  [ 'check', 'do.check' ],
  function do_check(selector) {
    this.__queue__.push(function do_check_step(callback) {
      let sel = unfunc(selector);

      debug(`do.check('${sel}')`);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) return false;

        element.checked = !element.checked;

        // Fire change event

        var event = document.createEvent('HTMLEvents');
        event.initEvent('change', true, true);
        element.dispatchEvent(event);

        return true;
      }, sel, (err, exists) => {
        if (err) return callback(err);

        if (!exists) {
          callback(new NavitError(`do.select('${sel}') failed - selector not found`));
          return;
        }

        callback();
      });
    });

    return this;
  }
]);


// Scroll to
//
functions.push([
  [ 'scrollTo', 'do.scrollTo' ],
  function do_scroll_to(x, y) {
    this.__queue__.push(function do_scroll_to_step(callback) {
      var sx = unfunc(x);
      var sy = unfunc(y);

      debug(`do.scrollTo(${sx}, ${sy})`);

      this.__page__.evaluate(function (x, y) {
        window.scrollTo(x, y);
      }, sx, sy, callback);
    });

    return this;
  }
]);


// Fill out a form
//
functions.push([
  [ 'fill', 'do.fill' ],
  function do_fill(selector, values, submit) {
    this.__queue__.push(function do_fill_step(callback) {
      let sel = unfunc(selector);

      debug(`do.fill('${sel}')`);

      this.__page__.evaluate(function (args) {
        var form = document.querySelector(args.selector);

        if (!form) return 'selector not found';

        var error;

        Object.keys(args.values).forEach(function (key) {
          if (error) return;

          var item = form[key];
          var value = args.values[key];

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
      }, { selector: sel, values: unfunc(values), submit: unfunc(submit) }, (err, result) => {
        if (err) return callback(err);

        if (result) {
          callback(new NavitError(`do.fill('${sel}') failed - ${result}`));
          return;
        }

        callback();
      });
    });

    return this;
  }
]);


// Clear
//
functions.push([
  [ 'clear', 'do.clear' ],
  function do_clear(selector) {
    this.__queue__.push(function do_clear_step(callback) {
      let sel = unfunc(selector);

      debug(`do.clear('${sel}')`);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) return false;

        if (typeof element.value !== 'undefined') element.value = '';

        if (element.contentEditable === 'true') {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
        }

        return true;
      }, sel, (err, exists) => {
        if (err) return callback(err);

        if (!exists) {
          callback(new NavitError(`do.clear('${sel}') failed - selector not found`));
          return;
        }

        callback();
      });
    });

    return this;
  }
]);


module.exports = functions;
