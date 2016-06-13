'use strict';


const debug      = require('debug')('navit');
const finalize   = require('../utils').finalize;
const NavitError = require('../error');
const unfunc     = require('../utils').unfunc;

let functions = [];


// Get page title
//
functions.push([
  [ 'title', 'get.title' ],
  function get_title(fn) {
    this.__queue__.push(function get_title_step(callback) {
      debug('get.title()');

      this.__page__.exec('webContents.getTitle', [], (err, title) => {
        if (err) return callback(err);

        finalize(fn, title, callback);
      });
    });

    return this;
  }
]);


// Get current page url
//
functions.push([
  [ 'url', 'get.url' ],
  function get_url(fn) {
    this.__queue__.push(function get_url_step(callback) {
      debug('get.url()');

      this.__page__.exec('webContents.getURL', [], (err, url) => {
        if (err) return callback(err);

        finalize(fn, url, callback);
      });
    });

    return this;
  }
]);


// Get element html
//
functions.push([
  [ 'html', 'get.html', 'get.body' ],
  function get_html(selector, fn) {
    if (!fn) {
      fn = selector;
      selector = null;
    }

    this.__queue__.push(function get_html_step(callback) {
      if (!selector) {

        debug('get.body()');

        this.__getContentSource__((err, html) => {
          if (err) return callback(err);

          finalize(fn, html, callback);
        });
        return;
      }

      let sel = unfunc(selector);

      debug(`get.html('${sel}')`);

      this.__page__.evaluate(function (selector) {
        var element = document.querySelector(selector);

        return { html: element ? element.innerHTML : false };
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (result.html === false) {
          callback(new NavitError(`get.html('${sel}') failed - selector not found`));
          return;
        }

        finalize(fn, result.html, callback);
      });
    });

    return this;
  }
]);


// Get cookies
//
functions.push([
  [ 'get.cookies' ],
  function get_cookies(fn) {
    this.__queue__.push(function get_cookies_step(callback) {
      debug('get.cookies()');

      this.__page__.exec('webContents.getURL', [], (err, url) => {
        if (err) return callback(err);

        let filter = { url };

        this.__page__.execAsync('webContents.session.cookies.get', [ filter ], (err, args) => {
          if (err) return callback(err);

          let e       = args[0],
              cookies = args[1];

          if (e) return callback(e);

          finalize(fn, cookies, callback);
        });
      });
    });

    return this;
  }
]);


module.exports = functions;
