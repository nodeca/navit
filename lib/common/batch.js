'use strict';


const NavitError = require('../error');


let functions = [];


// Create new batch
//
functions.push([
  [ 'batch.create' ],
  function batch_create(name, fn) {
    this.__sandbox__.batches = this.__sandbox__.batches || {};

    // Save current queue
    let oldQueue = this.__queue__;

    // Clear queue - prepare to store batch data
    this.__queue__ = [];

    // Create batch
    fn.call(this);

    // Save batch data
    this.__sandbox__.batches[name] = this.__queue__;

    // Restore queue
    this.__queue__ = oldQueue;

    return this;
  }
]);


// Run batch
//
functions.push([
  [ 'batch' ],
  function (name) {
    this.__sandbox__.batches = this.__sandbox__.batches || {};

    let batch = this.__sandbox__.batches[name];

    if (!batch) {
      throw new NavitError(`batch('${name}') not exists`);
    }

    // Add batch subqueue
    this.__queue__.push({ name, queue: batch });

    return this;
  }
]);


module.exports = functions;
