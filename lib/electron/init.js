'use strict';


const async = require('async');


let functions = [];


// Engine init
//
functions.push([
  [ '__initEngine__' ],
  function __initPhantom__(callback) {
    let enginePath    = require('electron-prebuilt');
    let driver        = require('./driver');
    let driverOptions = {
      parameters: this.__engineOptions__,
      path: enginePath
    };

    driver.create(driverOptions, (err, instance) => {
      if (err) return callback(err);

      this.__engine__ = instance;
      callback();
    });
  }
]);


// Page init
//
functions.push([
  [ '__initPage__' ],
  function (callback) {
    this.__engine__.createPage((err, page) => {
      if (err) return callback(err);

      async.series([
        next => page.invoke('win', 'setSize', 1600, 900, false, next),

        next => {
          this.__page__ = page;

          // Add tab info
          this.__tabs__.push({
            page,
            // Response will be filled after `.open()` call
            response: null
          });

          // Set current tab index
          this.__tabIndex__ = this.__tabs__.length - 1;

          next();
        }
      ], callback);
    });
  }
]);


// Helper to check page loading progress
//
functions.push([
  [ '__pageLoadDone__' ],
  function __pageLoadDone__(callback) {
    this.__page__.invoke('win', 'webContents.isLoading', (err, result) => {
      callback(err, !result);
    });
  }
]);


// Emulate content source since we have no direct access
//
functions.push([
  [ '__getContentSource__' ],
  function __getContentSource__(callback) {
    this.__page__.evaluate(function () {
      return [
        document.doctype ? document.doctype.name : '',
        document.head.innerHTML,
        document.head.outerHTML,
        document.body.innerHTML,
        document.body.outerHTML
      ];
    }, (err, result) => {
      if (err) return callback(err);

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

      callback(null, text);
    });
  }
]);


module.exports = functions;
