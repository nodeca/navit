'use strict';


const NavitError = require('./error');
const { isFunction } = require('./utils');


let commonFunctions = [
  require('./common/init'),
  require('./common/get'),
  require('./common/test'),
  require('./common/do'),
  require('./common/set'),
  require('./common/batch'),
  require('./common/tab')
];


let elFunctions = [].concat(commonFunctions, [
  // Override methods
  require('./electron/init'),
  require('./electron/get'),
  require('./electron/test'),
  require('./electron/do'),
  require('./electron/set'),
  require('./electron/frame')
]);


let DEFAULT_ENGINE_OPTIONS = {};


// Class Navit
//
// - options (Object)
//
function Navit(options, engineOptions) {
  if (!(this instanceof Navit)) { return new Navit(options, engineOptions); }

  this.__options__ = Object.assign(
    {},
    {
      engine: 'electron',
      inject: [],
      timeout: 10000,
      prefix: ''
    },
    JSON.parse(JSON.stringify(options || {})) // Filter { engine: undefined }
  );

  this.__options__.engine = this.__options__.engine.toLowerCase();

  if ([ 'electron' ].indexOf(this.__options__.engine) === -1) {
    throw new NavitError(`Unrecognized engine: '${this.__options__.engine}'`);
  }

  this.__engineOptions__ = Object.assign({}, DEFAULT_ENGINE_OPTIONS, engineOptions || {});

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

  functions.forEach(f => f.forEach(data => this.registerMethod(data[0], data[1])));
}


// Register function
//
// - route (String|Array) - route to function with function name ("get.title")
// - fn (Function|null) - instance function, remove if not set
//
Navit.prototype.registerMethod = function (route, fn) {
  let routes = Array.isArray(route) ? route : [ route ];

  routes.forEach(route => {
    let parts = route.split('.');
    /* eslint-disable consistent-this */
    let current = this;

    for (let i = 0; i < parts.length; i++) {
      if (parts.length === i + 1) {

        // If chain contains children - we should replace it with new function with same children
        if (current[parts[i]] && Object.keys(current[parts[i]]).length !== 0) {
          current[parts[i]] = fn ?
            Object.assign(fn.bind(this), current[parts[i]])
            :
            Object.assign({}, current[parts[i]]);
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
    await fn.apply(this, args);
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


Navit.prototype.__run = async function () {
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
      if (!isFunction(action)) {
        await runQueue(action.queue);
        continue;
      }

      await action.call(this);
    }
  };

  await runQueue(queue);
};


Navit.prototype.exit = async function () {
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
  return this.__run().then(onResolve, onReject);
};


Navit.prototype.catch = function (onReject) {
  return this.__run().then(null, onReject);
};


module.exports = Navit;
