'use strict';


var debug      = require('debug')('navit');
var format     = require('util').format;
var _          = require('lodash');
var NavitError = require('../error');
var fs         = require('fs');
var async      = require('async');


var functions = [];


// Open helper
//
function open(url, options, callback) {
  // TODO:
  //
  // - headers
  // - useragent
  // - POST
  // - response
  // - inject
  //
  async.series([
    next => this.__page__.exec('webContents.loadURL', [ url, {} ], next),

    next => this.__pageWait__(null, null, next),

    next => {
      // If is not html page - finish here
      /*if (self.__response__.contentType.indexOf('text/html') === -1) {
        callback();
        return;
      }*/

      // Inject client scripts from options after load
      async.eachSeries(this.__options__.inject, (scriptPath, cb) => {
        let fileContent;

        try {
          fileContent = fs.readFileSync(scriptPath, 'utf-8');
        } catch (e) {
          cb(e);
          return;
        }

        this.__page__.execAsync('webContents.executeJavaScript', [ fileContent ], cb);
      }, next);
    }
  ], callback);
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


// Go back
//
functions.push([
  [ 'back', 'do.back' ],
  function do_back() {
    this.__queue__.push(function do_back_step(callback) {
      debug('do.back()');

      this.__page__.exec('webContents.goBack', [], callback);
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

      this.__page__.exec('webContents.goForward', [], callback);
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
          let fileContent;

          try {
            fileContent = fs.readFileSync(scriptPath, 'utf-8');
          } catch (e) {
            cb(e);
            return;
          }

          this.__page__.execAsync('webContents.executeJavaScript', [ fileContent ], cb);
        }, next)
      ], callback);
    });

    if (_.isFunction(this.afterOpen)) {
      this.afterOpen();
    }

    return this;
  }
]);


// Inject
//
functions.push([
  [ 'inject', 'do.inject' ],
  function do_inject(type, filePath) {
    if (!filePath) {
      filePath = type;
      type = 'js';
    }

    var types = {
      js: true,
      css: true
    };

    this.__queue__.push(function do_inject_step(callback) {
      debug(format("do.inject('%s', '%s')", type, filePath));

      if (!types[type]) {
        callback(new NavitError(format("'do.inject': can't inject file of type '%s'", type)));
        return;
      }

      let fileContent;

      try {
        fileContent = fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        callback(e);
        return;
      }

      if (type === 'js') {
        this.__page__.execAsync('webContents.executeJavaScript', [ fileContent ], callback);
        return;
      }

      this.__page__.exec('webContents.insertCSS', [ fileContent ], callback);

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
      }, sel, (err, exists) => {
        if (err) {
          callback(err);
          return;
        }

        if (!exists) {
          callback(new NavitError(format("do.type('%s') failed - selector not found", sel)));
          return;
        }

        let keys = (_.isFunction(text) ? text() : text).split('');

        async.eachSeries(keys, (ch, cb) => {
          async.series([
            next => this.__page__.exec('webContents.sendInputEvent',
              [ { type: 'keyDown', keyCode: ch } ], next),

            next => this.__page__.exec('webContents.sendInputEvent',
              [ { type: 'char', keyCode: ch } ], next),

            next => this.__page__.exec('webContents.sendInputEvent',
              [ { type: 'keyUp', keyCode: ch } ], next)
          ], cb);
        }, callback);
      });
    });

    return this;
  }
]);


module.exports = functions;
