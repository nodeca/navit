'use strict';


const debug      = require('debug')('navit');
const _          = require('lodash');
const unfunc     = require('../utils').unfunc;
const NavitError = require('../error');


var functions = [];


// Set cookies
//
functions.push([
  [ 'cookie', 'set.cookie' ],
  function set_cookie(name, value) {
    this.__queue__.push(function set_cookie_step(callback) {
      debug('set.cookie()');

      // This can be called BEFORE page open, then url will be empty
      this.__page__.invoke('win', 'webContents.getURL', (err, url) => {
        if (err) return callback(err);

        let cookieDefaults = {
          // domain:   fetched from URL if not passed
          // hostname: fetched from URL
          // path:     `/` by default
          // value:    filled below
          session: true,   // `httponly` in phantom/slimer
          secure:   false,
          expires:  (new Date()).getTime() + (1000 * 60 * 60 * 24 * 365) // expires in 1 year
        };
        let cookieObj;
        let _name  = unfunc(name);
        let _value = unfunc(value);

        // call before open & no domain provided -> error
        if (!url && !_name.domain) {
          callback(new NavitError(`You should provide domain if set cookie before page open ${name}`));
          return;
        }

        if (!url) {
          // try to guess URL if page empty
          url = 'http' + (_name.secure ? 's' : '') + '://' + _name.domain + '/';
        }

        let hostname = require('url').parse(url, false, true).hostname;

        // `.set.cookie(name, value)`
        if (typeof _value !== 'undefined') {
          cookieObj = _.defaults({
            url,
            name:   _name,
            value:  _value,
            domain: hostname
          }, cookieDefaults);

        // `.set.cookie(name)`
        } else if (_.isString(_name)) {
          cookieObj = { name: _name }; // Dummy obj to mark removal

        // `.set.cookie(obj)`
        } else {
          cookieObj = _.defaults({ url }, _name, { domain: hostname }, cookieDefaults);
        }

        // Propagate `httponly` property to proper place
        if (cookieObj.httponly) cookieObj.session = cookieObj.httponly;

        if ((typeof cookieObj.expires !== 'undefined' && cookieObj.expires < Date.now()) ||
            (typeof cookieObj.value === 'undefined')) {
          this.__page__.invoke('winAsync', 'webContents.session.cookies.remove', url, cookieObj.name, callback);
          return;
        }

        this.__page__.invoke('winAsync', 'webContents.session.cookies.set', cookieObj, (err, args) => {
          if (err) return callback(err);

          callback(args[0] ? new NavitError(`Failed to set cookie ${JSON.stringify(cookieObj)}`) : null);
        });
      });
    });

    return this;
  }
]);


// Set zoom stup
//
functions.push([
  [ 'zoom', 'set.zoom' ],
  function set_zoom(scale) {
    this.__queue__.push(function set_zoom_step(callback) {
      let sc = unfunc(scale);

      debug(`set.zoom(${sc})`);

      this.__page__.evaluate(function (sc) {
        window.__navit__.zoom(sc);
      }, sc, callback);
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
        width: unfunc(width),
        height: unfunc(height)
      };

      debug(`set.viewport(${size.width}, ${size.height})`);

      this.__page__.invoke('win', 'setSize', size.width, size.height, false, err => {
        if (err) return callback(err);

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
      var ua = unfunc(string);

      debug(`set.useragent('${ua}')`);

      this.__page__.invoke('win', 'webContents.setUserAgent', ua, callback);
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
      var usr = unfunc(user);
      var pwd = unfunc(pass);

      debug(`set.authentication('${usr}', '${pwd}')`);

      this.__page__.invoke('execFn', function (user, pass) {
        this.webContents.on('login', function (event, request, authInfo, enter) {
          // event.preventDefault();
          enter(user, pass);
        });
      }, usr, pwd, callback);
    });

    return this;
  }
]);


module.exports = functions;
