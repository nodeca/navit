'use strict';


const debug      = require('debug')('navit');
const unfunc     = require('../utils').unfunc;
const NavitError = require('../error');


let functions = [];


// Set cookies
//
functions.push([
  [ 'cookie', 'set.cookie' ],
  function set_cookie(name, value) {
    this.__queue__.push(async function set_cookie_step() {
      debug('set.cookie()');

      // This can be called BEFORE page open, then url will be empty
      let url = await this.__page__.invoke('win', 'webContents.getURL');

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
        throw new NavitError(`You should provide domain if set cookie before page open ${name}`);
      }

      if (!url) {
        // try to guess URL if page empty
        url = 'http' + (_name.secure ? 's' : '') + '://' + _name.domain + '/';
      }

      let hostname = require('url').parse(url, false, true).hostname;

      // `.set.cookie(name, value)`
      if (typeof _value !== 'undefined') {
        cookieObj = Object.assign({}, cookieDefaults, {
          url,
          name:   _name,
          value:  _value,
          domain: hostname
        });

      // `.set.cookie(name)`
      } else if (typeof _name === 'string') {
        cookieObj = { name: _name }; // Dummy obj to mark removal

      // `.set.cookie(obj)`
      } else {
        cookieObj = Object.assign({}, cookieDefaults, { domain: hostname }, _name, { url });
      }

      // Propagate `httponly` property to proper place
      if (cookieObj.httponly) cookieObj.session = cookieObj.httponly;

      if ((typeof cookieObj.expires !== 'undefined' && cookieObj.expires < Date.now()) ||
          (typeof cookieObj.value === 'undefined')) {
        await this.__page__.invoke('winAsync', 'webContents.session.cookies.remove', url, cookieObj.name);
        return;
      }

      let args = await this.__page__.invoke('winAsync', 'webContents.session.cookies.set', cookieObj);

      if (args[0]) throw new NavitError(`Failed to set cookie ${JSON.stringify(cookieObj)}`);
    });

    return this;
  }
]);


// Set zoom stup
//
functions.push([
  [ 'zoom', 'set.zoom' ],
  function set_zoom(scale) {
    this.__queue__.push(async function set_zoom_step() {
      let sc = unfunc(scale);

      debug(`set.zoom(${sc})`);

      await this.__page__.evaluate(function (sc) {
        window.__navit__.zoom(sc);
      }, sc);
    });

    return this;
  }
]);


// Set viewport
//
functions.push([
  [ 'viewport', 'set.viewport' ],
  function set_viewport(width, height) {
    this.__queue__.push(async function set_viewport_step() {
      let size = {
        width: unfunc(width),
        height: unfunc(height)
      };

      debug(`set.viewport(${size.width}, ${size.height})`);

      await this.__page__.invoke('win', 'setSize', size.width, size.height, false);

      // Hack to allow resize happen
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    return this;
  }
]);


// Set useragent
//
functions.push([
  [ 'useragent', 'set.useragent' ],
  function set_useragent(string) {
    this.__queue__.push(async function set_useragent_step() {
      let ua = unfunc(string);

      debug(`set.useragent('${ua}')`);

      await this.__page__.invoke('win', 'webContents.setUserAgent', ua);
    });

    return this;
  }
]);


// Set authentication
//
functions.push([
  [ 'authentication', 'set.authentication' ],
  function set_authentication(user, pass) {
    this.__queue__.push(async function set_authentication_step() {
      let usr = unfunc(user);
      let pwd = unfunc(pass);

      debug(`set.authentication('${usr}', '${pwd}')`);

      await this.__page__.invoke('execFn', function (user, pass) {
        this.webContents.on('login', function (event, request, authInfo, enter) {
          // event.preventDefault();
          enter(user, pass);
        });
      }, usr, pwd);
    });

    return this;
  }
]);


module.exports = functions;
