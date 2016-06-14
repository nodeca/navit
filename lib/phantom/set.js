'use strict';


const debug      = require('debug')('navit');
const _          = require('lodash');
const unfunc     = require('../utils').unfunc;
// const NavitError = require('../error');


var functions = [];


// Set cookies
//
functions.push([
  [ 'cookie', 'set.cookie' ],
  function set_cookie(name, value) {
    this.__queue__.push(function set_cookie_step(callback) {
      debug('set.cookie()');

      this.__page__.evaluate(function () {
        return window.location.hostname;
      }, (err, hostname) => {
        if (err) return callback(err);

        let cookieDefaults = {
          // domain:   fetched from URL if not passed
          // hostname: fetched from URL
          // path:     `/` by default
          // value:    filled below
          httponly: true,
          secure: false,
          expires: (new Date()).getTime() + (1000 * 60 * 60 * 24 * 365) // expires in 1 year
        };
        let cookieObj;
        let _name  = unfunc(name);
        let _value = unfunc(value);

        // `.set.cookie(name, value)`
        if (typeof _value !== 'undefined') {
          cookieObj = _.defaults({
            name:   _name,
            value:  _value,
            domain: hostname
          }, cookieDefaults);

        // `.set.cookie(name)`
        } else if (_.isString(_name)) {
          // Dummy obj to mark removal
          cookieObj = _.defaults({
            name:    _name,
            value:   '',
            domain:  hostname,
            expires: 1 // Anything < Date.now() (0 fails in slimer)
          }, cookieDefaults);

        // `.set.cookie(obj)`
        } else {
          cookieObj = _.defaults({}, _name, { domain: hostname }, cookieDefaults);
        }

        this.__engine__.addCookie(cookieObj, err/*(err, failed)*/ => {
          if (err) return callback(err);

          // Can't check result because valu is reversed in phantom & slimer :(
          //callback(failed ? new NavitError(`Failed to set cookie ${JSON.stringify(cookieObj)}`) : null);
          callback();
        });
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

      this.__headers__ = unfunc(obj);
      callback();
    });

    return this;
  }
]);


module.exports = functions;
