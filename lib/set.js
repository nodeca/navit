'use strict';


var _ = require('lodash');


var functions = [];


// Set cookies
//
functions.push([
  [ 'cookies', 'set.cookies' ],
  function (name, value) {
    this.__queue__.push([ [ name, value ], function cookies(name, value, callback) {
      this.__page__.evaluate(function (name, value) {
        if (value !== null) {
          document.cookie = name + '=' + value;
          return;
        }

        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC';
      }, function (err) {
        if (err) {
          callback(err);
          return;
        }

        callback();
      }, name, value);
    } ]);

    return this;
  }
]);


module.exports = functions;
