'use strict';


const debug      = require('debug')('navit');
const unfunc     = require('../utils').unfunc;


let functions = [];


// Enter frame stub
//
functions.push([
  [ 'frame.enter' ],
  function frame_enter(selector) {
    this.__queue__.push(async function frame_enter_step() {
      let sel = unfunc(selector);

      debug(`frame.enter('${sel}')`);

      throw new Error('frame.* methods are not available due to lack of Electron API :(');
    });

    return this;
  }
]);


// Exit frame stub
//
functions.push([
  [ 'frame.exit' ],
  function frame_exit() {
    this.__queue__.push(async function frame_exit_step() {
      debug('frame.exit()');

      throw new Error('frame.* methods are not available due to lack of Electron API :(');
    });

    return this;
  }
]);


module.exports = functions;
