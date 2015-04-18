'use strict';


var format     = require('util').format;
var _          = require('lodash');
var NavitError = require('./error');


var functions = [];


// Create new batch
//
functions.push([
  [ 'batch.create' ],
  function batch_create(name, fn) {
    this.__sandbox__.batches = this.__sandbox__.batches || {};

    // Save current queue
    var oldQueue = this.__queue__;

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

    var batch = this.__sandbox__.batches[name];

    if (!batch) {
      throw new NavitError(format("batch('%s') not exists", name));
    }

    // Add batch subqueue
    this.__queue__.push({
      name: name,
      queue: batch
    });

    return this;
  }
]);


module.exports = functions;
