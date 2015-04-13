'use strict';

var functions = [];


// Open page
//
functions.push([
  [ 'open', 'do.open' ],
  function open(url) {
    this.__queue__.push([ [ url ], function open(url, callback) {
      this.__page__.open(url, function (err) {
        if (err) {
          callback(err);
          return;
        }

        // TODO: inject client scripts
        callback();
      });
    } ]);

    return this;
  }
]);

module.exports = functions;
