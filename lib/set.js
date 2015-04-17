'use strict';


var _ = require('lodash');


var functions = [];


// Set cookies
//
functions.push([
  [ 'cookie', 'set.cookie' ],
  function set_cookie(name, value) {
    var self = this;
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
      this.__page__.evaluate(function () {
        return window.location.hostname;
      }, function (err, hostname) {
        if (err) {
          callback(err);
          return;
        }

        var cookieObj;

        // `.set.cookie(name, value)`
        if (value) {
          cookieObj = _.defaults({
            name: _.isFunction(name) ? name() : name,
            value: _.isFunction(value) ? value() : value,
            domain: hostname
          }, cookieDefaults);

        // `.set.cookie(obj)`
        } else {
          cookieObj = _.defaults({}, name, { domain: hostname }, cookieDefaults);
        }

        self.__phantom__.addCookie(cookieObj, callback);
      });
    });

    return this;
  }
]);


// Set zoom
//
functions.push([
  [ 'zoom', 'set.zoom' ],
  function set_zoom(scale) {
    this.__queue__.push(function set_zoom_step(callback) {
      this.__page__.set('zoomFactor', _.isFunction(scale) ? scale() : scale, callback);
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

      this.__page__.set('viewportSize', size, callback);
    });

    return this;
  }
]);


// Set useragent
//
functions.push([
  [ 'useragent', 'set.useragent' ],
  function set_useragent(string) {
    var self = this;

    this.__queue__.push(function set_useragent_step(callback) {
      this.__page__.get('settings', function (err, settings) {
        if (err) {
          callback(err);
          return;
        }

        settings.userAgent = _.isFunction(string) ? string() : string;

        self.__page__.set('settings', settings, callback);
      });
    });

    return this;
  }
]);


// Set authentication
//
functions.push([
  [ 'authentication', 'set.authentication' ],
  function set_authentication(user, pass) {
    var self = this;

    this.__queue__.push(function set_authentication_step(callback) {
      this.__page__.get('settings', function (err, settings) {
        if (err) {
          callback(err);
          return;
        }

        settings.userName = _.isFunction(user) ? user() : user;
        settings.password = _.isFunction(pass) ? pass() : pass;

        self.__page__.set('settings', settings, callback);
      });
    });

    return this;
  }
]);


module.exports = functions;
