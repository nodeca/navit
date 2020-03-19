'use strict';


const debug      = require('debug')('navit');
const _          = require('lodash');
const fs         = require('fs');
const async      = require('async');
const NavitError = require('../error');
const unfunc     = require('../utils').unfunc;


let functions = [];

// Poll interval for `wait.*` functions
const POLL_INTERVAL = 50;

// Open helper
//
function open(url, options, callback) {
  let pageSettings, realUrl;

  async.series([

    // Remove memory cache if exists
    next => this.__page__.clearMemoryCache(next),

    // Set custom request headers
    next => this.__page__.set('customHeaders', options.headers, next),

    // Get page settings
    next => this.__page__.get('settings', (err, settings) => {
      if (err) return next(err);

      pageSettings = settings;
      next();
    }),

    // Make request
    next => this.__page__.openUrl(
      url,
      // If specify `data` SlimerJS will always make POST request (https://github.com/laurentj/slimerjs/issues/362)
      options.method.toLowerCase() === 'get' ?
        { operation: options.method } :
        { operation: options.method, data: options.data },
      pageSettings,
      next
    ),

    // Wait loading
    next => this.__pageWait__(null, null, next),

    // Reset custom headers back
    next => this.__page__.set('customHeaders', {}, next),

    // Get real url (may change after redirect)
    next => this.__page__.get('url', (err, url) => {
      if (err) return next(err);

      realUrl = url;
      next();
    }),

    // Get response
    next => this.__engine__.get('__responses__', (err, responses) => {
      if (err) return callback(err);

      // Find last actual
      // Can be empty on error
      this.__response__ = _.findLast(responses, resp => resp.url === realUrl) || {};

      // Save response data in tab info
      this.__tabs__[this.__tabIndex__].response = this.__response__;
      next();
    })
  ], err => {
    if (err) return callback(err);

    // If is not html page - finish here
    if ((this.__response__.contentType || '').indexOf('text/html') === -1) {
      callback();
      return;
    }

    // Inject client scripts from options after load
    async.eachSeries(this.__options__.inject, (scriptPath, next) => {
      this.__page__.injectJs(scriptPath, next);
    }, callback);
  });
}


// Open page
//
functions.push([
  [ 'open', 'do.open' ],
  function do_open(url, options) {
    this.__queue__.push(function do_open_step(callback) {
      let link = this.__options__.prefix + unfunc(url);

      debug(`do.open('${link}')`);

      let opt = _.defaults({}, options, {
        method: 'GET',
        data: {},
        headers: {}
      });

      opt.headers = _.defaults({}, opt.headers, this.__headers__);

      open.call(this, link, opt, callback);
    });

    if (_.isFunction(this.afterOpen)) this.afterOpen();

    return this;
  }
]);


// Open page with `POST` method
//
functions.push([
  [ 'post', 'do.post' ],
  function do_post(url, data, options) {
    this.__queue__.push(function do_post_step(callback) {
      let link = this.__options__.prefix + unfunc(url);

      debug(`do.post('${link}')`);

      let opt = _.defaults({}, options, {
        method: 'POST',
        data: data || {},
        headers: {}
      });

      opt.headers = _.defaults({}, opt.headers, this.__headers__);

      open.call(this, link, opt, callback);
    });

    if (_.isFunction(this.afterOpen)) this.afterOpen();

    return this;
  }
]);


// Go back
//
functions.push([
  [ 'back', 'do.back' ],
  function do_back() {
    this.__queue__.push(function do_back_step(callback) {
      debug('do.back()');

      this.__page__.goBack(callback);
    });

    return this;
  }
]);


// Go forward
//
functions.push([
  [ 'forward', 'do.forward' ],
  function do_forward() {
    this.__queue__.push(function do_forward_step(callback) {
      debug('do.forward()');

      this.__page__.goForward(callback);
    });

    return this;
  }
]);


// Reload page
//
functions.push([
  [ 'reload', 'do.reload' ],
  function do_reload() {
    this.__queue__.push(function do_reload_step(callback) {
      debug('do.reload()');

      async.series([
        next => this.__page__.evaluate(function () {
          document.location.href = document.location.href;
        }, next),

        next => this.__pageWait__(null, null, next),

        // Inject client scripts from options after load
        next => async.eachSeries(this.__options__.inject, (scriptPath, cb) => {
          this.__page__.injectJs(scriptPath, cb);
        }, next)
      ], callback);
    });

    if (_.isFunction(this.afterOpen)) this.afterOpen();

    return this;
  }
]);


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


// Inject
//
functions.push([
  [ 'inject', 'do.inject' ],
  function do_inject(type, filePath) {
    let self = this;

    if (!filePath) {
      filePath = type;
      type = 'js';
    }

    const types = {
      js: [ '<script>', '</script>' ],
      css: [ '<style>', '</style>' ]
    };

    this.__queue__.push(function do_inject_step(callback) {
      debug(`do.inject('${type || 'js'}', '${filePath}')`);

      if (!types[type]) {
        callback(new NavitError(`do.inject: can't inject file of type '${type}'`));
        return;
      }

      let fileContent;

      try {
        fileContent = fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        callback(e);
        return;
      }

      this.__page__.get('content', (err, pageContent) => {
        if (err) return callback(err);

        self.__page__.set('content', [ pageContent, types[type][0], fileContent, types[type][1] ].join(''), callback);
      });
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


// Type
//
functions.push([
  [ 'type', 'do.type' ],
  function do_type(selector, text) {
    this.__queue__.push(function do_type_step(callback) {
      let sel = unfunc(selector);

      debug(`do.type('${sel}', '${unfunc(text)}')`);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) {
          return false;
        }

        element.focus();

        if (element.contentEditable === 'true') {
          var sel = window.getSelection();
          var range = document.createRange();
          range.selectNodeContents(element);
          sel.addRange(range);
        }

        return true;
      }, sel, (err, exists) => {
        if (err) return callback(err);

        if (!exists) {
          callback(new NavitError(`do.type('${sel}', '${unfunc(text)}') failed - selector not found`));
          return;
        }

        this.__page__.sendEvent('keypress', unfunc(text), null, null, 0, callback);
      });
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


// Upload
//
functions.push([
  [ 'upload', 'do.upload' ],
  function do_upload(selector, path) {
    this.__queue__.push(function do_upload_step(callback) {
      var filePath = unfunc(path);

      debug(`do.upload('${filePath}')`);

      if (!fs.existsSync(filePath)) {
        callback(new NavitError(`do.upload: file '${filePath}' does not exists`));
        return;
      }

      this.__page__.uploadFile(unfunc(selector), filePath, callback);
    });

    return this;
  }
]);


// Take screenshot
//
// - selector (String)
// - boundingRect (Object|Array) - { top, left, width, height }
// - type (String) - PNG, GIF, JPEG or PDF
// - path (String)
//
functions.push([
  [ 'screenshot', 'do.screenshot' ],
  function screenshot(/*selector|boundingRect, type, path*/) {
    let path, selector, boundingRect, type;

    if (arguments.length > 1) {
      if (_.isString(arguments[0]) || _.isFunction(arguments[0])) {
        selector = arguments[0];
      } else {
        boundingRect = arguments[0];
      }

      path = arguments.length === 3 ? arguments[2] : arguments[1];
      type = arguments.length === 3 ? arguments[1] : 'PNG';
    } else {
      path = arguments[0];
      type = 'PNG';
    }

    this.__queue__.push(function screenshot_step(callback) {
      debug('do.screenshot()');

      this.__page__.get('clipRect', (err, oldRect) => {
        if (err) return callback(err);

        if (selector) {
          var sel = unfunc(selector);

          this.__page__.evaluate(function (selector) {
            var element = document.querySelector(selector);

            return element ? element.getBoundingClientRect() : null;
          }, sel, (err, newRect) => {
            if (err) return callback(err);

            if (!newRect) {
              callback(new NavitError(`screenshot('${sel}') failed - selector not found`));
              return;
            }

            this.__page__.set('clipRect', newRect, err => {
              if (err) return callback(err);

              this.__page__.render(unfunc(path), unfunc(type), err => {
                if (err) return callback(err);

                this.__page__.set('clipRect', oldRect, callback);
              });
            });
          });
          return;
        }

        if (boundingRect) {
          var newRect = _.isArray(boundingRect) ? {
            top: boundingRect[0],
            left: boundingRect[1],
            width: boundingRect[2],
            height: boundingRect[3]
          } : boundingRect;

          this.__page__.set('clipRect', newRect, err => {
            if (err) return callback(err);

            this.__page__.render(unfunc(path), unfunc(type), err => {
              if (err) return callback(err);

              this.__page__.set('clipRect', oldRect, callback);
            });
          });

          return;
        }

        this.__page__.render(unfunc(path), unfunc(type), callback);
      });
    });

    return this;
  }
]);


module.exports = functions;
