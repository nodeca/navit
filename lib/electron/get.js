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
    this.__queue__.push(async function get_title_step() {
      debug('get.title()');

      let title = await this.__page__.invoke('win', 'webContents.getTitle');

      await finalize(fn, title);
    });

    return this;
  }
]);


// Get current page url
//
functions.push([
  [ 'url', 'get.url' ],
  function get_url(fn) {
    this.__queue__.push(async function get_url_step() {
      debug('get.url()');

      let url = await this.__page__.invoke('win', 'webContents.getURL');

      await finalize(fn, url);
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

    this.__queue__.push(async function get_html_step() {
      if (!selector) {

        debug('get.body()');

        let html = await this.__getContentSource__();

        await finalize(fn, html);
        return;
      }

      let sel = unfunc(selector);

      debug(`get.html('${sel}')`);

      let result = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        return { html: element ? element.innerHTML : false };
      }, sel);

      if (result.html === false) {
        throw new NavitError(`get.html('${sel}') failed - selector not found`);
      }

      await finalize(fn, result.html);
    });

    return this;
  }
]);


// Get cookies
//
functions.push([
  [ 'get.cookies' ],
  function get_cookies(fn) {
    this.__queue__.push(async function get_cookies_step() {
      debug('get.cookies()');

      let url = await this.__page__.invoke('win', 'webContents.getURL');

      if (!url) {
        throw new NavitError('You should open the page before try to get cookies');
      }

      let filter = { url };

      let args = await this.__page__.invoke('winAsync', 'webContents.session.cookies.get', filter);

      let e       = args[0],
          cookies = args[1];

      if (e) throw e;

      await finalize(fn, cookies);
    });

    return this;
  }
]);


module.exports = functions;
