'use strict';


const debug = require('debug')('navit');


let functions = [];


// Engine init
//
functions.push([
  [ '__initEngine__' ],
  async function __initElectron__() {
    debug('__initEngine__()');

    let enginePath = this.__options__.enginePath;

    if (!enginePath) {
      try {
        enginePath = require('electron');
      } catch (err) {

        try {
          // Try legacy package name
          enginePath = require('electron-prebuilt');
        } catch (__) {
          throw err;
        }
      }
    }

    let driver        = require('./driver');
    let driverOptions = {
      parameters: this.__engineOptions__,
      path: enginePath
    };

    this.__engine__ = await driver.create(driverOptions);
  }
]);


// Page init
//
functions.push([
  [ '__initPage__' ],
  async function () {
    debug('__initPage__()');

    this.__page__ = await this.__engine__.createPage();

    await this.__page__.invoke('win', 'setSize', 1600, 900, false);

    // Add tab info
    this.__tabs__.push({
      page: this.__page__,
      // Response will be filled after `.open()` call
      response: null
    });

    // Set current tab index
    this.__tabIndex__ = this.__tabs__.length - 1;
  }
]);


// Helper to check page loading progress
//
functions.push([
  [ '__pageLoadDone__' ],
  async function __pageLoadDone__() {
    let result = await this.__page__.invoke('win', 'webContents.isLoading');
    return !result;
  }
]);


// Emulate content source since we have no direct access
//
functions.push([
  [ '__getContentSource__' ],
  async function __getContentSource__() {
    let result = await this.__page__.evaluate(function () {
      return [
        document.doctype ? document.doctype.name : '',
        document.head.innerHTML,
        document.head.outerHTML,
        document.body.innerHTML,
        document.body.outerHTML
      ];
    });

    let text = '';

    // Try to filter text content by contentType, to avoid text wrap

    if ((this.__response__.contentType || '').toLowerCase().indexOf('text/html') !== -1) {
      // doctype
      if (result[0]) text += `<!DOCTYPE ${result[0]}>`;
      // head
      if (result[1]) text += result[2];
      // body
      if (result[3]) text += result[4];
    } else {
      text += result[3];
    }

    return text;
  }
]);


module.exports = functions;
