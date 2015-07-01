'use strict';


var debug      = require('debug')('navit');
var format     = require('util').format;
var _          = require('lodash');
var fs         = require('fs');
var async      = require('async');
var NavitError = require('./error');


var functions = [];

// Poll interval for `wait.*` functions
var POLL_INTERVAL = 50;

// Helper to wait page load
//
function pageWait(timeout, time, callback) {
  var self = this;

  if (!time) {
    time = +Date.now();
  }

  self.__engine__.get('__loadDone__', function (err, result) {
    if (err) {
      callback(err);
      return;
    }

    if (result) {
      callback();
      return;
    }

    // If timeout exceeded - return error
    if (Date.now() - time > (timeout || self.__options__.timeout)) {
      callback(new NavitError('page loading timed out'));
      return;
    }

    // Retry after delay
    setTimeout(function () {
      pageWait.call(self, timeout, time, callback);
    }, POLL_INTERVAL);
  });
}


// Open helper
//
function open(url, options, callback) {
  var self = this;

  this.__page__.get('customHeaders', function (err, oldHeaders) {
    if (err) {
      callback(err);
      return;
    }

    var newHeaders = _.assign({}, oldHeaders, options.headers);

    self.__page__.set('customHeaders', newHeaders, function (err) {
      if (err) {
        callback(err);
        return;
      }

      self.__page__.open(url, options.method, options.data, function (err) {
        if (err) {
          callback(err);
          return;
        }

        // Restore old headers after request
        self.__page__.set('customHeaders', oldHeaders, function (err) {
          if (err) {
            callback(err);
            return;
          }

          // Get real url (may change after redirect)
          self.__page__.get('url', function (err, realUrl) {
            if (err) {
              callback(err);
              return;
            }

            // Get responses
            self.__engine__.get('__responses__', function (err, responses) {
              if (err) {
                callback(err);
                return;
              }

              // Find last actual
              self.__response__ = _.findLast(responses, function (resp) {
                return resp.url === realUrl;
              });

              // Save response data in tab info
              self.__tabs__[self.__tabIndex__].response = self.__response__;

              pageWait.call(self, null, null, function (err) {
                if (err) {
                  callback(err);
                  return;
                }

                // If is not html page - finish here
                if (self.__response__.contentType.indexOf('text/html') === -1) {
                  callback();
                  return;
                }

                // Inject client scripts from options after load
                async.eachSeries(self.__options__.inject, function (scriptPath, next) {
                  self.__page__.injectJs(scriptPath, next);
                }, callback);
              });
            });
          });
        });
      });
    });
  });
}


// Open page
//
functions.push([
  [ 'open', 'do.open' ],
  function do_open(url, options) {
    var self = this;

    this.__queue__.push(function do_open_step(callback) {
      var link = this.__options__.prefix + (_.isFunction(url) ? url() : url);

      debug(format("do.open('%s')", link));

      var opt = _.defaults({}, options, {
        method: 'GET',
        data: {},
        headers: {}
      });

      open.call(this, link, opt, callback);
    });

    if (_.isFunction(this.afterOpen)) {
      this.afterOpen();
    }

    return this;
  }
]);


// Open page with `POST` method
//
functions.push([
  [ 'post', 'do.post' ],
  function do_post(url, data, options) {
    var self = this;

    this.__queue__.push(function do_post_step(callback) {
      var link = this.__options__.prefix + (_.isFunction(url) ? url() : url);

      debug(format("do.post('%s')", link));

      var opt = _.defaults({}, options, {
        method: 'POST',
        data: data || {},
        headers: {}
      });

      open.call(this, link, opt, callback);
    });

    if (_.isFunction(this.afterOpen)) {
      this.afterOpen();
    }

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
    var self = this;

    this.__queue__.push(function do_reload_step(callback) {
      debug('do.reload()');

      this.__page__.evaluate(function () {
        document.location.reload();
      }, function (err) {
        if (err) {
          callback(err);
          return;
        }

        pageWait.call(self, null, null, function (err) {
          if (err) {
            callback(err);
            return;
          }

          // Inject client scripts from options after load
          async.eachSeries(self.__options__.inject, function (scriptPath, next) {
            self.__page__.injectJs(scriptPath, next);
          }, callback);
        });
      });
    });

    if (_.isFunction(this.afterOpen)) {
      this.afterOpen();
    }

    return this;
  }
]);


// Waiting
//
functions.push([
  [ 'wait', 'do.wait' ],
  function do_wait(param, timeout) {
    var self = this;
    var time;
    var params;

    // `.wait(fn [, params..., timeout])`
    if (_.isFunction(param)) {
      params = Array.prototype.slice.call(arguments, 1, param.length + 1);
      timeout = arguments.length > param.length + 1 ? arguments[param.length + 1] : null;
    }

    function selectorCheck(callback) {
      self.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        // TODO: we should cast result to number in case of
        // https://github.com/baudehlo/node-phantom-simple/issues/43
        result = +result;

        // If selector is on page - done
        if (result > 0) {
          callback();
          return;
        }

        // If timeout exceeded - return error
        if (Date.now() - time > (timeout || self.__options__.timeout)) {
          callback(new NavitError("'do.wait' timed out"));
          return;
        }

        // Retry after delay
        setTimeout(function () {
          selectorCheck.call(self, callback);
        }, POLL_INTERVAL);
      }, param);
    }

    function fnCheck(callback) {
      self.__page__.evaluate.apply(self.__page__, [ param, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        // If `fn` return `true` - done
        if (result) {
          callback();
          return;
        }

        // If timeout exceeded - return error
        if (Date.now() - time > (timeout || self.__options__.timeout)) {
          callback(new NavitError("'do.wait' timed out"));
          return;
        }

        // Retry after delay
        setTimeout(function () {
          fnCheck.call(self, callback);
        }, POLL_INTERVAL);
      } ].concat(params.map(function (param) {
        return _.isFunction(param) ? param() : param;
      })));
    }

    this.__queue__.push(function do_wait_step(callback) {
      debug('do.wait()');

      // `.wait(delay)`
      if (_.isNumber(param)) {
        setTimeout(callback, param);

      // `.wait(selector [, timeout])` - wait for selector appear
      } else if (_.isString(param)) {
        time = +Date.now();
        selectorCheck(callback);

      // `.wait(fn [, params..., timeout])` - wait while function not return true
      } else if (_.isFunction(param)) {
        time = +Date.now();
        fnCheck(callback);

      // `.wait()`
      } else {
        time = +Date.now();
        pageWait.call(self, timeout, null, callback);
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
    var self = this;

    if (!filePath) {
      filePath = type;
      type = 'js';
    }

    var types = {
      js: [ '<script>', '</script>' ],
      css: [ '<style>', '</style>' ]
    };

    this.__queue__.push(function do_inject_step(callback) {
      debug(format("do.inject('%s', '%s')", type, filePath));

      if (!types[type]) {
        callback(new NavitError(format("'do.inject': can't inject file of type '%s'", type)));
        return;
      }

      var fileContent;

      try {
        fileContent = fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        callback(e);
        return;
      }

      this.__page__.get('content', function (err, pageContent) {
        if (err) {
          callback(err);
          return;
        }

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
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("do.click('%s')", sel));

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) {
          return false;
        }

        var evt = document.createEvent('MouseEvent');

        evt.initEvent('click', true, true);
        element.dispatchEvent(evt);

        return true;
      }, function (err, exists) {
        if (err) {
          callback(err);
          return;
        }

        if (!exists) {
          callback(new NavitError(format("do.click('%s') failed - selector not found", sel)));
          return;
        }

        callback();
      }, sel);
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
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("do.select('%s')", sel));

      this.__page__.evaluate(function (selector, option) {
        var element = document.querySelector(selector);

        if (!element) {
          return false;
        }

        element.value = option;

        // Fire change event

        var event = document.createEvent('HTMLEvents');
        event.initEvent('change', true, true);
        element.dispatchEvent(event);

        return true;
      }, function (err, exists) {
        if (err) {
          callback(err);
          return;
        }

        if (!exists) {
          callback(new NavitError(format("do.select('%s') failed - selector not found", sel)));
          return;
        }

        callback();
      }, sel, _.isFunction(option) ? option() : option);
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
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("do.check('%s')", sel));

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) {
          return false;
        }

        element.checked = !element.checked;

        // Fire change event

        var event = document.createEvent('HTMLEvents');
        event.initEvent('change', true, true);
        element.dispatchEvent(event);

        return true;
      }, function (err, exists) {
        if (err) {
          callback(err);
          return;
        }

        if (!exists) {
          callback(new NavitError(format("do.select('%s') failed - selector not found", sel)));
          return;
        }

        callback();
      }, sel);
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
      var sx = _.isFunction(x) ? x() : x;
      var sy = _.isFunction(y) ? y() : y;

      debug(format('do.scrollTo(%d, %d)', sx, sy));

      this.__page__.evaluate(function (x, y) {
        window.scrollTo(x, y);
      }, callback, sx, sy);
    });

    return this;
  }
]);


// Type
//
functions.push([
  [ 'type', 'do.type' ],
  function do_type(selector, text) {
    var self = this;

    this.__queue__.push(function do_type_step(callback) {
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("do.type('%s')", sel));

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
      }, function (err, exists) {
        if (err) {
          callback(err);
          return;
        }

        if (!exists) {
          callback(new NavitError(format("do.type('%s') failed - selector not found", sel)));
          return;
        }

        self.__page__.sendEvent('keypress', _.isFunction(text) ? text() : text, null, null, 0, callback);
      }, sel);
    });

    return this;
  }
]);


// Clear
//
functions.push([
  [ 'clear', 'do.clear' ],
  function do_clear(selector) {
    var self = this;

    this.__queue__.push(function do_clear_step(callback) {
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("do.clear('%s')", sel));

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) {
          return false;
        }

        if (typeof element.value !== 'undefined') {
          element.value = '';
        }

        if (element.contentEditable === 'true') {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
        }

        return true;
      }, function (err, exists) {
        if (err) {
          callback(err);
          return;
        }

        if (!exists) {
          callback(new NavitError(format("do.clear('%s') failed - selector not found", sel)));
          return;
        }

        callback();
      }, sel);
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
      var filePath = _.isFunction(path) ? path() : path;

      debug(format("do.upload('%s')", filePath));

      if (!fs.existsSync(filePath)) {
        callback(new NavitError(format("'do.upload': file '%s' does not exists", filePath)));
        return;
      }

      this.__page__.uploadFile(_.isFunction(selector) ? selector() : selector, filePath, callback);
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
    var self = this;
    var path, selector, boundingRect, type;

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

    function saveScreenshot(callback) {
      self.__page__.render(_.isFunction(path) ? path() : path, _.isFunction(type) ? type() : type, callback);
    }

    this.__queue__.push(function screenshot_step(callback) {
      debug('do.screenshot()');

      self.__page__.get('clipRect', function (err, oldRect) {
        if (err) {
          callback(err);
          return;
        }

        if (selector) {
          var sel = _.isFunction(selector) ? selector() : selector;

          self.__page__.evaluate(function (selector) {
            var element = document.querySelector(selector);

            return element ? element.getBoundingClientRect() : null;
          }, function (err, newRect) {
            if (err) {
              callback(err);
              return;
            }

            if (!newRect) {
              callback(new NavitError(format("screenshot('%s') failed - selector not found", sel)));
              return;
            }

            self.__page__.set('clipRect', newRect, function (err) {
              if (err) {
                callback(err);
                return;
              }

              saveScreenshot(function (err) {
                if (err) {
                  callback(err);
                  return;
                }

                self.__page__.set('clipRect', oldRect, callback);
              });
            });
          }, sel);
          return;
        }

        if (boundingRect) {
          var newRect = _.isArray(boundingRect) ? {
            top: boundingRect[0],
            left: boundingRect[1],
            width: boundingRect[2],
            height: boundingRect[3]
          } : boundingRect;

          self.__page__.set('clipRect', newRect, function (err) {
            if (err) {
              callback(err);
              return;
            }

            saveScreenshot(function (err) {
              if (err) {
                callback(err);
                return;
              }

              self.__page__.set('clipRect', oldRect, callback);
            });
          });

          return;
        }

        saveScreenshot(callback);
      });
    });

    return this;
  }
]);


module.exports = functions;
