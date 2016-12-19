'use strict';


const debug      = require('debug')('navit');
const async      = require('async');
const NavitError = require('../error');
const _          = require('lodash');


let functions = [];


// Engine init
//
functions.push([
  [ '__initEngine__' ],
  function __initPhantom__(callback) {
    debug('__initEngine__()');

    let enginePath = this.__options__.enginePath;

    if (!enginePath) {
      switch (this.__options__.engine) {
        case 'phantomjs':
          try {
            enginePath = require('phantomjs-prebuilt').path;
          } catch (__) {}

          if (!enginePath) {
            enginePath = require('phantomjs').path;
          }
          break;
        case 'slimerjs':
          enginePath = require('slimerjs').path;
          break;
      }
    }

    let driver = require('node-phantom-simple');
    let driverOptions = {
      parameters: {},
      path: enginePath
    };

    // Fill engine parameters
    _.forEach(this.__engineOptions__, (optionValue, optionName) => {
      driverOptions.parameters[_.kebabCase(optionName)] = optionValue;
    });

    driver.create(driverOptions, (err, instance) => {
      if (err) return callback(err);

      this.__engine__ = instance;
      callback();
    });
  }
]);


/* global phantom */ // Used inside browser context

// Page init
//
functions.push([
  [ '__initPage__' ],
  function __initPage__(callback) {
    debug('__initPage__()');

    this.__engine__.createPage((err, page) => {
      if (err) return callback(err);

      async.series([
        // Reset responses array
        next => this.__engine__.set('__responses__', [], next),

        // Save all received resources
        next => page.setFn('onResourceReceived', function (response) {
          phantom.__responses__.push(response);
        }, next),

        next => page.setFn('onNavigationRequested', function (url, type, willNavigate) {
          if (willNavigate) {
            phantom.__loadDone__ = false;
          }
        }, next),

        next => page.setFn('onLoadFinished', function () {
          phantom.__loadDone__ = true;
        }, next),

        // Rethrow errors from phantom
        next => page.setFn('onError', function (msg /*, trace*/) {
          // TODO: process trace

          // On js error - throw from phantom environment (will be catched by `evaluate` callback)
          throw  msg;
        }, next),

        next => page.set('viewportSize', { width: 1600, height: 900 }, next),

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
    this.__engine__.get('__loadDone__', callback);
  }
]);


const POLL_INTERVAL = 50;

// Helper to wait for page load
//
functions.push([
  [ '__pageWait__' ],
  function __pageWait__(timeout, time, callback) {
    if (!time) time = +Date.now();

    this.__pageLoadDone__((err, result) => {
      if (err) return callback(err);

      if (result) {
        callback();
        return;
      }

      // If timeout exceeded - return error
      if (Date.now() - time > (timeout || this.__options__.timeout)) {
        callback(new NavitError('page loading timed out'));
        return;
      }

      // Retry after delay
      setTimeout(() => this.__pageWait__(timeout, time, callback), POLL_INTERVAL);
    });
  }
]);


module.exports = functions;
