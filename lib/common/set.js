'use strict';


const debug      = require('debug')('navit');
const unfunc     = require('../utils').unfunc;
// const NavitError = require('../error');


var functions = [];


// Set headers
//
functions.push([
  [ 'headers', 'set.headers' ],
  function set_headers(obj) {
    this.__queue__.push(function set_headers_step(callback) {
      debug('set.headers()');

      this.__headers__ = unfunc(obj);
      callback();
    });

    return this;
  }
]);


module.exports = functions;
