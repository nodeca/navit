'use strict';


const debug      = require('debug')('navit');
const unfunc     = require('../utils').unfunc;


let functions = [];


// Enter frame stub
//
functions.push([
  [ 'frame.enter' ],
  function frame_enter(selector) {
    this.__queue__.push(function frame_enter_step(callback) {
      let sel = unfunc(selector);

      debug(`frame.enter('${sel}')`);

      callback(new Error('frame.* methods not available due to lack of Electron API :('));
    });

    return this;
  }
]);


// Exit frame stub
//
functions.push([
  [ 'frame.exit' ],
  function frame_exit() {
    this.__queue__.push(function frame_exit_step(callback) {
      debug('frame.exit()');

      callback(new Error('frane.* methods not available due to lack of Electron API :('));
    });

    return this;
  }
]);


module.exports = functions;
