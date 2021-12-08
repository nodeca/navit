'use strict';


const NavitError = require('./error');


function isFunction(val) {
  const cls = Object.prototype.toString.call(val);

  return cls === '[object Function]' ||
    cls === '[object AsyncFunction]' ||
    cls === '[object GeneratorFunction]' ||
    cls === '[object Proxy]';
}


exports.isFunction = isFunction;

// Return result to user, depending on param type in signature
//
exports.finalize = async function finalize(fn, result) {
  // If `fn` is array - push result
  if (Array.isArray(fn)) {
    fn.push(result);
    return;
  }

  if (!isFunction(fn) || fn.length !== 1) {
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
  return isFunction(val) ? val() : val;
};
