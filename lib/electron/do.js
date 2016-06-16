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
      this.__page__.invoke('open', url, options, (err, response) => {
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

        this.__page__.invoke('winAsync', 'webContents.executeJavaScript', fileContent, cb);
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


// Post stub
//
functions.push([
  [ 'post', 'do.post' ],
  function do_forward() {
    this.__queue__.push(function do_forward_step(callback) {
      debug('do.post()');

      callback(new Error('POST method not available due to lack of Electron API :('));
    });

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

      this.__page__.invoke('win', 'webContents.goBack', callback);
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

      this.__page__.invoke('win', 'webContents.goForward', callback);
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

        next => this.__page__.invoke('win', 'webContents.reload', next),
        /*next => this.__page__.evaluate(function () {
          document.location.href = document.location.href;
        }, next),*/

        next => this.__pageWait__(null, null, next),

        // Inject client scripts from options after load
        next => async.eachSeries(this.__options__.inject, (scriptPath, cb) => {
          let fileContent;

          try {
            fileContent = fs.readFileSync(scriptPath, 'utf-8');
          } catch (e) {
            return cb(e);
          }

          this.__page__.invoke('winAsync', 'webContents.executeJavaScript', fileContent, cb);
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
        this.__page__.invoke('winAsync', 'webContents.executeJavaScript', fileContent, callback);
        return;
      }

      this.__page__.invoke('win', 'webContents.insertCSS', fileContent, callback);
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
            next => this.__page__.invoke('win', 'webContents.sendInputEvent',
              { type: 'keyDown', keyCode: ch }, next),

            next => this.__page__.invoke('win', 'webContents.sendInputEvent',
              { type: 'char', keyCode: ch }, next),

            next => this.__page__.invoke('win', 'webContents.sendInputEvent',
              { type: 'keyUp', keyCode: ch }, next)
          ], cb);
        }, err  => {
          if (err) return callback(err);

          // TODO: can we do better?
          // Without timeout we can go forward before renderer received
          // all typed characters
          setTimeout(() => callback(), 100);
        });
      });
    });

    return this;
  }
]);


// Upload
//
// Hack from https://github.com/electron/electron/issues/749#issuecomment-213822739
// until better method available
//
functions.push([
  [ 'upload', 'do.upload' ],
  function do_upload(selector, path) {
    this.__queue__.push(function do_upload_step(callback) {
      var filePath = unfunc(path);

      debug(`do.upload('${filePath}')`);

      if (!fs.existsSync(filePath)) {
        callback(new NavitError(`'do.upload': file '${filePath}' does not exists`));
        return;
      }

      this.__page__.invoke('execFnAsync', function (selector, filePath, cb) {
        let wc = this.webContents;

        try {
          wc.debugger.attach('1.1');
        } catch (err) {
          cb('Debugger attach failed: ' + err);
          return;
        }

        wc.debugger.sendCommand('DOM.getDocument', {}, function (err, res) {
          if (err && Object.keys(err).length) {
            wc.debugger.detach();
            cb('failed to get document ' + err);
            return;
          }

          wc.debugger.sendCommand('DOM.querySelector', {
            nodeId: res.root.nodeId,
            selector  // CSS selector of input[type=file] element
          }, function (err, res) {
            if (err && Object.keys(err).length) {
              wc.debugger.detach();
              cb('failed to locate selector ' + selector + '[' + err + ']');
              return;
            }

            wc.debugger.sendCommand('DOM.setFileInputFiles', {
              nodeId: res.nodeId,
              files: [ filePath ]  // Actual list of paths
            }, function (err/*, res*/) {
              wc.debugger.detach();

              if (err && Object.keys(err).length) {
                wc.debugger.detach();
                cb('failed to set input file ' + filePath + '[' + err + ']');
                return;
              }

              cb();
            });
          });
        });

      }, unfunc(selector), filePath, callback);
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

    path          = unfunc(path);
    selector      = unfunc(selector);
    boundingRect  = unfunc(boundingRect);
    type          = unfunc(type);

    let opts = { path, type };


    function capture(opts, cb) {
      function toBin(image) {
        let bin = (opts.type.toLowerCase() === 'png') ? image.toPng() : image.toJpeg(100);
        let result = new Array(bin.length);

        for (let i = 0; i < result.length; i++) result[i] = bin[i];

        cb(null, result);
      }

      let params = opts.boundingRect ? [ opts.boundingRect, toBin ] : [ toBin ];

      this.capturePage.apply(this, params);
    }

    let saveImage = function (opts, cb) {
      // TODO: need to replace delay with more safe method of
      // renderer wait.
      setTimeout(() => {
        this.__page__.invoke('execFnAsync', capture, opts, (err, result) => {
          if (err) return cb(err);
          // console.log(result);
          let buf = new Buffer(result.length);
          for (let i = 0; i < result.length; i++) buf[i] = result[i];

          fs.writeFileSync(opts.path, buf);
          cb();
        });
      }, 500);
    }.bind(this);

    this.__queue__.push(function screenshot_step(callback) {
      debug('do.screenshot()');

      if ([ 'png', 'jpg' ].indexOf(type.toLowerCase()) === -1) {
        callback(new NavitError('Image type can be JPG or PNG only'));
        return;
      }

      if (selector) {
        this.__page__.evaluate(function (selector) {
          var element = document.querySelector(selector);

          return element ? element.getBoundingClientRect() : null;
        }, selector, (err, newRect) => {
          if (err) return callback(err);

          if (!newRect) {
            callback(new NavitError(`screenshot('${selector}') failed - selector not found`));
            return;
          }

          opts.boundingRect = newRect;
          saveImage(opts, callback);
        });
        return;
      }

      if (boundingRect) {
        let newRect = _.isArray(boundingRect) ? {
          x: boundingRect[0],
          y: boundingRect[1],
          width: boundingRect[2],
          height: boundingRect[3]
        } : boundingRect;

        opts.boundingRect = newRect;
        saveImage(opts, callback);
        return;
      }

      saveImage(opts, callback);
    });

    return this;
  }
]);


module.exports = functions;
