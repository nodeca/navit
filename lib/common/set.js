'use strict';


const debug      = require('debug')('navit');
const unfunc     = require('../utils').unfunc;
// const NavitError = require('../error');


let functions = [];


// Set headers
//
functions.push([
  [ 'headers', 'set.headers' ],
  function set_headers(obj) {
    this.__queue__.push(async function set_headers_step() {
      debug('set.headers()');

      this.__headers__ = unfunc(obj);
    });

    return this;
  }
]);


module.exports = functions;
