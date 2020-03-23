'use strict';


const NavitError = require('../error');


let functions = [];


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
