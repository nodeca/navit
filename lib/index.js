'use strict';


/* global phantom */ // Used inside browser context
var driver     = require('node-phantom-simple');
var format     = require('util').format;
var _          = require('lodash');
var async      = require('async');
var NavitError = require('./error');


var functions = [ './get', './test', './do', './set', './batch', './tab', './frame' ];


var DEFAULT_ENGINE_OPTIONS = {};


// Class Navit
//
// - options (Object)
//
function Navit(options, engineOptions) {
  if (!(this instanceof Navit)) { return new Navit(options, engineOptions); }

  var self = this;

  this.__options__ = _.defaults({}, options || {}, {
    engine: 'phantomjs',
    inject: [],
    timeout: 5000,
    prefix: ''
  });

  this.__options__.engine = this.__options__.engine.toLowerCase();

  if ([ 'phantomjs', 'slimerjs' ].indexOf(this.__options__.engine) === -1) {
    throw new NavitError(format("Unrecognized engine: '%s'", this.__options__.engine));
  }

  this.__engineOptions__ = _.defaults({}, engineOptions || {}, DEFAULT_ENGINE_OPTIONS);

  this.__engine__ = null;
  this.__page__ = null;
  this.__queue__ = [];
  this.__response__ = null;
  this.__sandbox__ = {};
  this.__tabs__ = [];
  this.__tabIndex__ = -1;

  this.afterOpen = null;

  // Register functions
  functions.forEach(function (path) {
    require(path).forEach(function (data) {
      self.registerMethod(data[0], data[1]);
    });
  });
}


// Register function
//
// - route (String|Array) - route to function with function name ("get.title")
// - fn (Function|null) - instance function, remove if not set
//
Navit.prototype.registerMethod = function (route, fn) {
  var self = this;

  var routes = _.isArray(route) ? route : [ route ];

  routes.forEach(function (route) {
    var parts = route.split('.');
    var current = self;

    for (var i = 0; i < parts.length; i++) {
      if (parts.length === i + 1) {

        // If chain contains children - we should replace it with new function with same children
        if (current[parts[i]] && Object.keys(current[parts[i]]).length !== 0) {
          current[parts[i]] = fn ? _.assign(fn.bind(self), current[parts[i]]) : _.assign({}, current[parts[i]]);
        } else {
          current[parts[i]] = fn ? fn.bind(self) : null;
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
    // If `fn` is sync
    if (fn.length === args.length) {
      cb(fn.apply(this, args));
      return;
    }

    // If `fn` async
    fn.apply(this, args.concat([ cb ]));
  });

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

  var self = this;
  var queue = this.__queue__;

  // Reset old queue
  this.__queue__ = [];

  function runQueue(queue, callback) {
    async.eachSeries(queue, function (action, cb) {

      // If it is named batch - recursive run
      if (!_.isFunction(action)) {
        runQueue(action.queue, cb);
        return;
      }

      action.call(self, cb);
    }, callback);
  }

  async.series([
    // Init phantom if not initialized or already closed
    function (next) {
      if (self.__engine__) {
        next();
        return;
      }
      self.__initPhantom__(next);
    },

    // Init page if not initialized or already closed
    function (next) {
      if (self.__page__) {
        next();
        return;
      }
      self.__initPage__(next);
    },

    // Run queue
    function (next) {
      runQueue(queue, next);
    }
  ], function (err) {
    if (err) {
      callback.call(this, err);
      return;
    }

    if (teardown) {
      self.close(callback.bind(this));
      return;
    }

    callback.call(this);
  });
};


Navit.prototype.close = function (callback) {
  if (!this.__engine__) {
    if (callback) { callback(); }
    return;
  }

  this.__page__ = null;
  this.__response__ = null;
  this.__tabs__ = [];
  this.__tabIndex__ = -1;

  this.__engine__.exit(callback || null);
  this.__engine__ = null;
};


Navit.prototype.__initPhantom__ = function (callback) {
  var self = this;
  var driverOptions = {
    parameters: {},
    path: require(this.__options__.engine).path
  };

  // Fill engine parameters
  _.forEach(this.__engineOptions__, function (optionValue, optionName) {
    driverOptions.parameters[_.kebabCase(optionName)] = optionValue;
  });

  driver.create(driverOptions, function (err, instance) {
    if (err) {
      callback(err);
      return;
    }

    self.__engine__ = instance;
    callback();
  });
};


Navit.prototype.__initPage__ = function (callback) {
  var self = this;

  self.__engine__.createPage(function (err, page) {
    if (err) {
      callback(err);
      return;
    }

    async.series([
      // Reset responses array
      function (next) {
        self.__engine__.set('__responses__', [], next);
      },

      // Save all received resources
      function (next) {
        page.setFn('onResourceReceived', function (response) {
          phantom.__responses__.push(response);
        }, next);
      },

      function (next) {
        page.setFn('onNavigationRequested', function (url, type, willNavigate) {
          if (willNavigate) {
            phantom.__loadDone__ = false;
          }
        }, next);
      },

      function (next) {
        page.setFn('onLoadFinished', function () {
          phantom.__loadDone__ = true;
        }, next);
      },

      // Rethrow errors from phantom
      function (next) {
        page.setFn('onError', function (msg /*, trace*/) {
          // TODO: process trace

          // On js error - throw from phantom environment (will be catched by `evaluate` callback)
          throw  msg;
        }, next);
      },

      function (next) {
        page.set('viewportSize', { width: 1600, height: 900 }, function (err) {
          if (err) {
            next(err);
            return;
          }

          self.__page__ = page;

          // Add tab info
          self.__tabs__.push({
            page: page,
            // Response will be filled after `.open()` call
            response: null
          });

          // Set current tab index
          self.__tabIndex__ = self.__tabs__.length - 1;

          next();
        });
      }
    ], callback);
  });
};


module.exports = Navit;
