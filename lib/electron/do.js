'use strict';


var debug      = require('debug')('navit');
var format     = require('util').format;
var _          = require('lodash');
var async      = require('async');
var NavitError = require('../error');


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

  self.__page__.exec('webContents.isLoading', [], function (err, result) {
    if (err) {
      callback(err);
      return;
    }

    if (!result) {
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

  // TODO:
  //
  // - headers
  // - useragent
  // - POST
  // - response
  // - inject
  //
  self.__page__.exec('webContents.loadURL', [ url, {} ], function (err) {
    if (err) {
      callback(err);
      return;
    }

    pageWait.call(self, null, null, callback);
  });
}


// Open page
//
functions.push([
  [ 'open', 'do.open' ],
  function do_open(url, options) {
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
        document.location.href = document.location.href;
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
      }, param, function (err, result) {
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
      });
    }

    function fnCheck(callback) {

      self.__page__.evaluate.apply(self.__page__,
        [ param ].concat(params.map(function (param) {
          return _.isFunction(param) ? param() : param;
        })).concat([ function (err, result) {
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
        } ])
      );
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


module.exports = functions;
