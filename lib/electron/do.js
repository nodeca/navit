'use strict';


var debug      = require('debug')('navit');
var format     = require('util').format;
var _          = require('lodash');


var functions = [];


// Open helper
//
function open(url, options, callback) {
  var self = this;

  // TODO:
  //
  // - headers
  // - useragent
  // - POST
  // - response
  // - inject
  //
  self.__page__.exec('webContents.loadURL', [ url, {} ], function (err) {
    if (err) {
      callback(err);
      return;
    }

    self.__pageWait__(null, null, callback);
  });
}


// Open page
//
functions.push([
  [ 'open', 'do.open' ],
  function do_open(url, options) {
    this.__queue__.push(function do_open_step(callback) {
      var link = this.__options__.prefix + (_.isFunction(url) ? url() : url);

      debug(format("do.open('%s')", link));

      var opt = _.defaults({}, options, {
        method: 'GET',
        data: {},
        headers: {}
      });

      open.call(this, link, opt, callback);
    });

    if (_.isFunction(this.afterOpen)) {
      this.afterOpen();
    }

    return this;
  }
]);


// Go back
//
functions.push([
  [ 'back', 'do.back' ],
  function do_back() {
    this.__queue__.push(function do_back_step(callback) {
      debug('do.back()');

      this.__page__.exec('webContents.goBack', [], callback);
    });

    return this;
  }
]);


// Go forward
//
functions.push([
  [ 'forward', 'do.forward' ],
  function do_forward() {
    this.__queue__.push(function do_forward_step(callback) {
      debug('do.forward()');

      this.__page__.exec('webContents.goForward', [], callback);
    });

    return this;
  }
]);


module.exports = functions;
