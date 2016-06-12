'use strict';


var debug  = require('debug')('navit');
var format = require('util').format;
var _      = require('lodash');


var functions = [];


// Set viewport
//
functions.push([
  [ 'viewport', 'set.viewport' ],
  function set_viewport(width, height) {
    this.__queue__.push(function set_viewport_step(callback) {
      var size = {
        width: _.isFunction(width) ? width() : width,
        height: _.isFunction(height) ? height() : height
      };

      debug(format('set.viewport(%d, %d)', size.width, size.height));

      this.__page__.exec('setSize', [ size.width, size.height, false ], err => {
        if (err) {
          callback(err);
          return;
        }
        // Hack to allow resize happen
        setTimeout(callback, 100);
      });
    });

    return this;
  }
]);


// Set useragent
//
functions.push([
  [ 'useragent', 'set.useragent' ],
  function set_useragent(string) {
    this.__queue__.push(function set_useragent_step(callback) {
      var ua = _.isFunction(string) ? string() : string;

      debug(format("set.useragent('%s')", ua));

      this.__page__.exec('webContents.setUserAgent', [ ua ], callback);
    });

    return this;
  }
]);


module.exports = functions;
