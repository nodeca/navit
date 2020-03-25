'use strict';


const _          = require('lodash');
const NavitError = require('./error');


let commonFunctions = [
  './common/init',
  './common/get',
  './common/test',
  './common/do',
  './common/set',
  './common/batch',
  './common/tab'
];


let elFunctions = [].concat(commonFunctions, [
  // Override methods
  './electron/init',
  './electron/get',
  './electron/test',
  './electron/do',
  './electron/set',
  './electron/frame'
]);


let DEFAULT_ENGINE_OPTIONS = {};


function isAsyncFunction(obj) {
  let constructor = obj.constructor;
  /*istanbul ignore if*/
  if (!constructor) {
    return false;
  }
  if (constructor.name === 'AsyncFunction' ||
      constructor.displayName === 'AsyncFunction') {
    return true;
  }
  return false;
}


// Class Navit
//
// - options (Object)
//
function Navit(options, engineOptions) {
  if (!(this instanceof Navit)) { return new Navit(options, engineOptions); }

  this.__options__ = _.defaults({}, options || {}, {
    engine: 'electron',
    inject: [],
    timeout: 10000,
    prefix: ''
  });

  this.__options__.engine = this.__options__.engine.toLowerCase();

  if ([ 'electron' ].indexOf(this.__options__.engine) === -1) {
    throw new NavitError(`Unrecognized engine: '${this.__options__.engine}'`);
  }

  this.__engineOptions__ = _.defaults({}, engineOptions || {}, DEFAULT_ENGINE_OPTIONS);

  this.__engine__ = null;
  this.__page__ = null;
  this.__queue__ = [];
  this.__response__ = null;
  this.__sandbox__ = {};
  this.__tabs__ = [];
  this.__tabIndex__ = -1;
  this.__headers__ = {}; // Custom headers, joined to each request

  this.afterOpen = null;

  // Register functions
  let functions = this.__options__.engine === 'electron' ? elFunctions : commonFunctions;

  functions.forEach(path =>
    require(path).forEach(data => this.registerMethod(data[0], data[1])));
}


// Register function
//
// - route (String|Array) - route to function with function name ("get.title")
// - fn (Function|null) - instance function, remove if not set
//
Navit.prototype.registerMethod = function (route, fn) {
  let routes = _.isArray(route) ? route : [ route ];

  routes.forEach(route => {
    let parts = route.split('.');
    /* eslint-disable consistent-this */
    let current = this;

    for (let i = 0; i < parts.length; i++) {
      if (parts.length === i + 1) {

        // If chain contains children - we should replace it with new function with same children
        if (current[parts[i]] && Object.keys(current[parts[i]]).length !== 0) {
          current[parts[i]] = fn ? _.assign(fn.bind(this), current[parts[i]]) : _.assign({}, current[parts[i]]);
        } else {
          current[parts[i]] = fn ? fn.bind(this) : null;
        }
        break;
      }

      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }

      current = current[parts[i]];
    }
  });

  return this;
};


// Run async callback between steps
//
Navit.prototype.fn = function (fn /*, params...*/) {
  let args = Array.prototype.slice.call(arguments, 1);

  this.__queue__.push(async function navit_fn() {
    if (isAsyncFunction(fn)) {
      await fn.apply(this, args);
      return;
    }

    // If `fn` has no callback
    if (fn.length === args.length) {
      await fn.apply(this, args);
      return;
    }

    // If `fn` is with callback
    await new Promise((resolve, reject) => {
      fn.apply(this, args.concat([ err => {
        if (err) reject(err); else resolve(err);
      } ]));
    });
  });

  return this;
};

// Close engine instance
//
Navit.prototype.close = function () {
  this.__queue__.push(async function navit_close() { await this.exit(); });
  return this;
};


// Load specified plugin with given params into current instance
//
Navit.prototype.use = function (plugin /*, params... */) {
  let args = [ this ].concat(Array.prototype.slice.call(arguments, 1));

  plugin.apply(plugin, args);

  return this;
};


Navit.prototype.run = async function (teardown, callback) {
  if (!callback) {
    callback = teardown;
    teardown = null;
  }

  if (_.isFunction(callback)) {
    try {
      await this.run(teardown);
    } catch (err) {
      callback(err);
      return;
    }

    callback();
    return;
  }

  let queue = this.__queue__;

  // Reset old queue
  this.__queue__ = [];

  let runQueue = async queue => {
    for (let action of queue) {
      // Init engine if not initialized or already closed
      if (!this.__engine__) await this.__initEngine__();

      // Init page if not initialized or already closed
      if (!this.__page__) await this.__initPage__();

      // If it is named batch - recursive run
      if (!_.isFunction(action)) {
        await runQueue(action.queue);
        continue;
      }

      await action.call(this);
    }
  };

  await runQueue(queue);

  if (teardown) await this.exit();
};


Navit.prototype.exit = async function (callback) {
  if (callback) {
    try {
      await this.exit();
    } catch (err) {
      callback(err);
      return;
    }

    callback();
    return;
  }

  if (!this.__engine__) return;

  this.__page__ = null;
  this.__response__ = null;
  this.__tabs__ = [];
  this.__tabIndex__ = -1;

  let tmp = this.__engine__;

  this.__engine__ = null;
  await tmp.exit();
};


Navit.prototype.then = function (onResolve, onReject) {
  return this.run().then(onResolve, onReject);
};


Navit.prototype.catch = function (onReject) {
  return this.run().then(null, onReject);
};


module.exports = Navit;
