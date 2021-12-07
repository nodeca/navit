'use strict';


const _          = require('lodash');
const NavitError = require('./error');


// Return result to user, depending on param type in signature
//
exports.finalize = async function finalize(fn, result) {
  // If `fn` is array - push result
  if (_.isArray(fn)) {
    fn.push(result);
    return;
  }

  if (!_.isFunction(fn) || fn.length !== 1) {
    throw new NavitError("'fn' param should be a function with single argument");
  }

  // If `fn` sync or returning promise
  if (fn.length === 1) {
    await fn(result);
    return;
  }

  // If `fn` async w/callback
  await new Promise((resolve, reject) => {
    fn(result, err => {
      if (err) reject(err); else resolve(err);
    });
  });
};


exports.unfunc = function unfunc(val) {
  return _.isFunction(val) ? val() : val;
};
