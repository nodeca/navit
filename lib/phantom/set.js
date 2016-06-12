'use strict';


const debug  = require('debug')('navit');
const _      = require('lodash');
const unfunc = require('../utils').unfunc;


var functions = [];


// Set cookies
//
functions.push([
  [ 'cookie', 'set.cookie' ],
  function set_cookie(name, value) {
    let cookieDefaults = {
      name,
      value,
      domain: '.localhost',
      path: '/',
      httponly: true,
      secure: false,
      expires: (new Date()).getTime() + (1000 * 60 * 60 * 24 * 365) // expires in 1 year
    };

    this.__queue__.push(function set_cookie_step(callback) {
      debug('set.cookie()');

      this.__page__.evaluate(function () {
        return window.location.hostname;
      }, (err, hostname) => {
        if (err) {
          callback(err);
          return;
        }

        let cookieObj;

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

        this.__engine__.addCookie(cookieObj, callback);
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
      let sc = unfunc(scale);

      debug(`set.zoom(${sc})`);

      this.__page__.set('zoomFactor', sc, callback);
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
      let size = {
        width: unfunc(width),
        height: unfunc(height)
      };

      debug(`set.viewport(${size.width}, ${size.height})`);

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
    this.__queue__.push(function set_useragent_step(callback) {
      let ua = unfunc(string);

      debug(`set.useragent('${ua}')`);

      this.__page__.get('settings', (err, settings) => {
        if (err) return callback(err);

        settings.userAgent = ua;

        this.__page__.set('settings', settings, callback);
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
    this.__queue__.push(function set_authentication_step(callback) {
      let usr = unfunc(user);
      let pwd = unfunc(pass);

      debug(`set.authentication('${usr}', '${pwd}')`);

      this.__page__.get('settings', (err, settings) => {
        if (err) return callback(err);

        settings.userName = usr;
        settings.password = pwd;

        this.__page__.set('settings', settings, callback);
      });
    });

    return this;
  }
]);


// Set headers
//
functions.push([
  [ 'headers', 'set.headers' ],
  function set_headers(obj) {
    this.__queue__.push(function set_headers_step(callback) {
      debug('set.headers()');

      this.__page__.set('customHeaders', unfunc(obj), callback);
    });

    return this;
  }
]);


module.exports = functions;
