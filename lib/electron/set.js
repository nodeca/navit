'use strict';


var debug  = require('debug')('navit');
var format = require('util').format;
var _      = require('lodash');


var functions = [];


// Set cookies
//
functions.push([
  [ 'cookie', 'set.cookie' ],
  function set_cookie(name, value) {
    var cookieDefaults = {
      name: name,
      value: value,
      domain: '.localhost',
      path: '/',
      httponly: true,
      secure: false,
      expires: (new Date()).getTime() + (1000 * 60 * 60 * 24 * 365) // expires in 1 year
    };

    this.__queue__.push(function set_cookie_step(callback) {
      debug('set.cookie()');

      this.__page__.exec('webContents.getURL', [], (err, url) => {
        if (err) { return callback(err); }

        this.__page__.evaluate(function () {
          return window.location.hostname;
        }, (err, hostname) => {
          if (err) { return callback(err); }

          var cookieObj;

          // `.set.cookie(name, value)`
          if (value) {
            cookieObj = _.defaults({
              url,
              name: _.isFunction(name) ? name() : name,
              value: _.isFunction(value) ? value() : value,
              domain: hostname
            }, cookieDefaults);

          // `.set.cookie(obj)`
          } else {
            cookieObj = _.defaults({ url }, name, { domain: hostname }, cookieDefaults);
          }

          if (cookieObj.expires && cookieObj.expires < Date.now()) {
            this.__page__.execAsync('webContents.session.cookies.remove', [ url, cookieObj.name ], callback);
            return null;
          }

          this.__page__.execAsync('webContents.session.cookies.set', [ cookieObj ], (err, args) => {
            if (err) { return callback(err); }

            callback(args[0]);
          });
        });
      });
    });

    return this;
  }
]);


// Set viewport
//
functions.push([
  [ 'viewport', 'set.viewport' ],
  function set_viewport(width, height) {
    this.__queue__.push(function set_viewport_step(callback) {
      var size = {
        width: _.isFunction(width) ? width() : width,
        height: _.isFunction(height) ? height() : height
      };

      debug(format('set.viewport(%d, %d)', size.width, size.height));

      this.__page__.exec('setSize', [ size.width, size.height, false ], err => {
        if (err) {
          callback(err);
          return;
        }
        // Hack to allow resize happen
        setTimeout(callback, 100);
      });
    });

    return this;
  }
]);


// Set useragent
//
functions.push([
  [ 'useragent', 'set.useragent' ],
  function set_useragent(string) {
    this.__queue__.push(function set_useragent_step(callback) {
      var ua = _.isFunction(string) ? string() : string;

      debug(format("set.useragent('%s')", ua));

      this.__page__.exec('webContents.setUserAgent', [ ua ], callback);
    });

    return this;
  }
]);


// Set authentication
//
functions.push([
  [ 'authentication', 'set.authentication' ],
  function set_authentication(user, pass) {
    this.__queue__.push(function set_authentication_step(callback) {
      var usr = _.isFunction(user) ? user() : user;
      var pwd = _.isFunction(pass) ? pass() : pass;

      debug(format("set.authentication('%s', '%s')", usr, pwd));

      this.__page__.execFn(function (user, pass) {
        this.webContents.on('login', function (event, request, authInfo, enter) {
          // event.preventDefault();
          enter(user, pass);
        });
      }, [ usr, pwd ], callback);
    });

    return this;
  }
]);


module.exports = functions;
