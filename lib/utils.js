'use strict';


var _          = require('lodash');
var NavitError = require('./error');


// Return result to user, depending on param type in signature
//
exports.finalize = function finalize(fn, result, callback) {
  // If `fn` is array - push result
  if (_.isArray(fn)) {
    fn.push(result);
    callback();
    return;
  }

  if (!_.isFunction(fn) || (fn.length !== 1 && fn.length !== 2)) {
    callback(new NavitError("'fn' param should be a function with one or two arguments"));
    return;
  }

  // If `fn` sync
  if (fn.length === 1) {
    callback(fn(result));
    return;
  }

  // If `fn` async
  fn(result, callback);
};


exports.unfunc = function unfunc(val) {
  return _.isFunction(val) ? val() : val;
};
