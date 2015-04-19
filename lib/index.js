'use strict';


var format     = require('util').format;
var phantom    = require('node-phantom-simple');
var _          = require('lodash');
var async      = require('async');
var NavitError = require('./error');


var functions = [ './get', './test', './do', './set', './batch' ];


// Class Navit
//
// - options (Object)
//
function Navit(options) {
  if (!(this instanceof Navit)) { return new Navit(options); }

  var self = this;

  this.__options__ = _.defaults({}, options || {}, {
    // Specific options
    inject: [],
    timeout: 5000,
    port: 12301,

    // Engines options
    loadImages: true,
    ignoreSslErrors: true,
    sslProtocol: 'any',
    webSecurity: true,
    proxyType: 'http'
  });

  this.__phantom__ = null;
  this.__page__ = null;
  this.__queue__ = [];
  this.__response__ = null;
  this.__sandbox__ = {};

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
      if (self.__phantom__) {
        next();
        return;
      }
      self.__initPhantom__(next);
    },

    // Init page
    function (next) {
      // TODO: close previous page
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
      self.close();
    }

    callback.call(this);
  });
};


Navit.prototype.close = function () {
  if (this.__phantom__) {
    this.__phantom__.exit();
    this.__phantom__ = null;
  }
};


Navit.prototype.__initPhantom__ = function (callback) {
  var self = this;
  var phantomParameters = {};

  // Fill phantom options
  _.forEach({
    loadImages: 'load-images',
    ignoreSslErrors: 'ignore-ssl-errors',
    sslProtocol: 'ssl-protocol',
    webSecurity: 'web-security',
    proxy: 'proxy',
    proxyType: 'proxy-type',
    proxyAuth: 'proxy-auth',
    cookiesFile: 'cookies-file'
  }, function (phantomOptionName, navitOptionName) {
    if (self.__options__.hasOwnProperty(navitOptionName)) {
      phantomParameters[phantomOptionName] = self.__options__[navitOptionName];
    }
  });

  phantom.create(function (err, ph) {
    if (err) {
      callback(err);
      return;
    }

    self.__phantom__ = ph;
    callback();
  }, { parameters: phantomParameters, phantomPath: require('phantomjs').path });
};


Navit.prototype.__initPage__ = function (callback) {
  var self = this;

  self.__phantom__.createPage(function (err, page) {
    if (err) {
      callback(err);
      return;
    }

    async.series([
      // Reset responses array
      function (next) {
        self.__phantom__.set('__responses__', [], next);
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
          next();
        });
      }
    ], callback);
  });
};


module.exports = Navit;
