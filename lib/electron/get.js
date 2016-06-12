'use strict';


var debug      = require('debug')('navit');
var finalize   = require('../utils').finalize;

var functions = [];


// Get page title
//
functions.push([
  [ 'title', 'get.title' ],
  function get_title(fn) {
    this.__queue__.push(function get_title_step(callback) {
      debug('get.title()');

      this.__page__.exec('webContents.getTitle', [], function (err, title) {
        if (err) {
          callback(err);
          return;
        }

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

      this.__page__.exec('webContents.getURL', [], function (err, url) {
        if (err) {
          callback(err);
          return;
        }

        finalize(fn, url, callback);
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
        if (err) { return callback(err); }

        let filter = { url };

        this.__page__.execAsync('webContents.session.cookies.get', [ filter ], (err, args) => {
          if (err) { return callback(err); }

          let e       = args[0],
              cookies = args[1];

          if (e) { return callback(e); }

          finalize(fn, cookies, callback);
        });
      });
    });

    return this;
  }
]);


module.exports = functions;
