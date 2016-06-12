'use strict';


const debug      = require('debug')('navit');
const NavitError = require('../error');
const unfunc     = require('../utils').unfunc;


let functions = [];


// Enter frame
//
functions.push([
  [ 'frame.enter' ],
  function frame_enter(selector) {
    this.__queue__.push(function frame_enter_step(callback) {
      let sel = unfunc(selector);

      debug(`frame.enter('${sel}')`);

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
      }, sel, (err, result) => {
        if (err) return callback(err);

        if (result.index === false) {
          callback(new NavitError(`frame.enter('${sel}') failed - selector not found`));
          return;
        }

        this.__page__.switchToFrame(result.index, callback);
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
