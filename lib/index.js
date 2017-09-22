'use strict';


var _          = require('lodash');
var async      = require('async');
var NavitError = require('./error');


var phFunctions = [
  './phantom/init',
  './phantom/get',
  './phantom/test',
  './phantom/do',
  './phantom/set',
  './batch',
  './phantom/tab',
  './phantom/frame'
];
var elFunctions = [].concat(phFunctions, [
  // Override methods
  './electron/init',
  './electron/get',
  './electron/test',
  './electron/do',
  './electron/set',
  './electron/frame'
]);


var DEFAULT_ENGINE_OPTIONS = {};


function isAsyncFunction(obj) {
  var constructor = obj.constructor;
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


function isPromise(obj) {
  return typeof obj.then === 'function';
}


// Class Navit
//
// - options (Object)
//
function Navit(options, engineOptions) {
  if (!(this instanceof Navit)) { return new Navit(options, engineOptions); }

  this.__options__ = _.defaults({}, options || {}, {
    engine: 'phantomjs',
    inject: [],
    timeout: 10000,
    prefix: ''
  });

  this.__options__.engine = this.__options__.engine.toLowerCase();

  if ([ 'phantomjs', 'slimerjs', 'electron' ].indexOf(this.__options__.engine) === -1) {
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
  let functions = this.__options__.engine === 'electron' ? elFunctions : phFunctions;

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
  var args = Array.prototype.slice.call(arguments, 1);

  this.__queue__.push(function (cb) {
    if (isAsyncFunction(fn)) {
      fn.apply(this, args).then(
        function ()    { cb(); },
        function (err) { cb(err); }
      );
      return;
    }
    // If `fn` has no callback
    if (fn.length === args.length) {
      var result = fn.apply(this, args);

      if (result && isPromise(result)) {
        result.then(
          function ()    { cb(); },
          function (err) { cb(err); }
        );
        return;
      }

      cb(fn.apply(this, args));
      return;
    }

    // If `fn` is with callback
    fn.apply(this, args.concat([ cb ]));
  });

  return this;
};

// Close engine instance
//
Navit.prototype.close = function () {
  this.__queue__.push(cb => this.exit(cb));
  return this;
};


// Load specified plugin with given params into current instance
//
Navit.prototype.use = function (plugin /*, params... */) {
  var args = [ this ].concat(Array.prototype.slice.call(arguments, 1));

  plugin.apply(plugin, args);

  return this;
};


Navit.prototype.run = function (teardown, callback) {
  if (!callback) {
    callback = teardown;
    teardown = null;
  }

  if (!_.isFunction(callback)) {
    return new Promise((resolve, reject) => {
      this.run(teardown, (err, data) => (err ? reject(err) : resolve(data)));
    });
  }

  let self = this;
  let queue = this.__queue__;

  // Reset old queue
  this.__queue__ = [];

  let runQueue = function (queue, next) {
    async.eachSeries(queue, (action, cb) => {
      async.series([
        // Init phantom if not initialized or already closed
        next => (this.__engine__ ? next() : this.__initEngine__(next)),

        // Init page if not initialized or already closed
        next => (this.__page__ ? next() : this.__initPage__(next)),

        next => {
          // If it is named batch - recursive run
          if (!_.isFunction(action)) {
            runQueue(action.queue, next);
            return;
          }
          action.call(this, next);
        }
      ], cb);
    }, next);
  }.bind(this);

  runQueue(queue, err => {
    if (err) return callback.call(this, err);

    if (teardown) {
      self.exit(callback.bind(this));
      return;
    }

    callback.call(this);
  });
};


Navit.prototype.exit = function (callback) {
  if (!callback) {
    return new Promise((resolve, reject) => {
      this.exit(err => (err ? reject(err) : resolve()));
    });
  }

  if (!this.__engine__) {
    callback();
    return;
  }

  this.__page__ = null;
  this.__response__ = null;
  this.__tabs__ = [];
  this.__tabIndex__ = -1;

  let tmp = this.__engine__;

  this.__engine__ = null;
  tmp.exit(callback);
};


Navit.prototype.then = function (onResolve, onReject) {
  return this.run().then(onResolve, onReject);
};


Navit.prototype.catch = function (onReject) {
  return this.run().then(null, onReject);
};


module.exports = Navit;
