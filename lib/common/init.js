'use strict';


const debug      = require('debug')('navit');
const NavitError = require('../error');


let functions = [];


const POLL_INTERVAL = 50;

// Helper to wait for page load
//
functions.push([
  [ '__pageWait__' ],
  async function __pageWait__(timeout, time) {
    debug('__pageWait__()');

    if (!time) time = +Date.now();

    while (!await this.__pageLoadDone__()) {
      // If timeout exceeded - return error
      if (Date.now() - time > (timeout || this.__options__.timeout)) {
        throw new NavitError('page loading timed out');
      }

      // Retry after delay
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
]);


module.exports = functions;
