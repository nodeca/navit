'use strict';


var debug      = require('debug')('navit');
var format     = require('util').format;
var _          = require('lodash');
var NavitError = require('../error');


var functions = [];


// Enter frame
//
functions.push([
  [ 'frame.enter' ],
  function frame_enter(selector) {
    var self = this;

    this.__queue__.push(function frame_enter_step(callback) {
      var sel = _.isFunction(selector) ? selector() : selector;

      debug(format("frame.enter('%s')", sel));

      this.__page__.evaluate(function (selector) {
        var target = document.querySelector(selector);
        var frames = document.querySelectorAll('iframe');

        // Find frame position on page for phantomjs
        for (var i = 0; i < frames.length; i++) {
          if (frames[i] === target) {
            return { index: i };
          }
        }

        return { index: false };
      }, sel, function (err, result) {
        if (err) {
          callback(err);
          return;
        }

        if (result.index === false) {
          callback(new NavitError(format("frame.enter('%s') failed - selector not found", sel)));
          return;
        }

        self.__page__.switchToFrame(result.index, callback);
      });
    });

    return this;
  }
]);


// Exit frame
//
functions.push([
  [ 'frame.exit' ],
  function frame_exit() {
    this.__queue__.push(function frame_exit_step(callback) {
      debug('frame.exit()');

      this.__page__.switchToMainFrame(callback);
    });

    return this;
  }
]);


module.exports = functions;
