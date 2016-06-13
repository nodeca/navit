'use strict';


const debug      = require('debug')('navit');
const _          = require('lodash');
const NavitError = require('../error');
const fs         = require('fs');
const async      = require('async');
const unfunc     = require('../utils').unfunc;


let functions = [];


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
    next => {
      this.__page__.open(url, options, (err, response) => {
        if (err) {
          next(err);
          return;
        }

        // Can be empty on error
        this.__response__ = response;

        // Save response data in tab info
        this.__tabs__[this.__tabIndex__].response = this.__response__;

        next();
      });
    },

    next => this.__pageWait__(null, null, next),

    next => {
      // If is not html page - finish here
      /*if ((self.__response__.contentType || '').indexOf('text/html') === -1) {
        callback();
        return;
      }*/

      // Inject client scripts from options after load
      async.eachSeries(this.__options__.inject, (scriptPath, cb) => {
        let fileContent;

        try {
          fileContent = fs.readFileSync(scriptPath, 'utf-8');
        } catch (e) {
          return cb(e);
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
      var link = this.__options__.prefix + unfunc(url);

      debug(`do.open('${link}')`);

      var opt = _.defaults({}, options, {
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
            return cb(e);
          }

          this.__page__.execAsync('webContents.executeJavaScript', [ fileContent ], cb);
        }, next)
      ], callback);
    });

    if (_.isFunction(this.afterOpen)) this.afterOpen();

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
      debug(`do.inject('${type}', '${filePath}')`);

      if (!types[type]) {
        return callback(new NavitError(`'do.inject': can't inject file of type ${type}`));
      }

      let fileContent;

      try {
        fileContent = fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        return callback(e);
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
      var sel = unfunc(selector);

      debug(`do.type('${sel}')`);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        if (!element) return false;

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
          callback(new NavitError(`do.type('${sel}') failed - selector not found`));
          return;
        }

        let keys = unfunc(text).split('');

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
