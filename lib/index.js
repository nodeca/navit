'use strict';


var phantom = require('node-phantom-simple');
var _       = require('lodash');
var async   = require('async');


var functions = [ './get', './test', './do', './set' ];


// Class Navit
//
// - options (Object)
//
function Navit(options) {
  if (!(this instanceof Navit)) { return new Navit(options); }

  var self = this;

  this.options = _.defaults({}, options || {}, {
    // Specific options
    inject: [],
    timeout: 5000,
    interval: 50,
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

  // Register functions
  functions.forEach(function (path) {
    require(path).forEach(function (data) {
      self.registerMethod(data[0], data[1]);
    });
  });

  this.__initPhantom__();
  this.__initPage__();
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


Navit.prototype.run = function (callback) {
  var self = this;
  var queue = this.__queue__;

  // Reset old queue
  this.__queue__ = [];
  this.__initPage__();

  async.eachSeries(queue, function (action, cb) {
    action[1].apply(self, action[0].concat([ cb ]));
  }, callback.bind(this));

  // TODO: close page
};


Navit.prototype.close = function () {
  if (this.__phantom__) {
    this.__phantom__.exit();
    this.__phantom__ = null;
  }
};


Navit.prototype.__initPhantom__ = function () {
  var self = this;

  self.__queue__.push([ [], function initPhantom(callback) {
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
      if (self.options.hasOwnProperty(navitOptionName)) {
        phantomParameters[phantomOptionName] = self.options[navitOptionName];
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
  } ]);

  return this;
};


Navit.prototype.__initPage__ = function () {
  var self = this;

  self.__queue__.push([ [], function initPage(callback) {
    self.__phantom__.createPage(function (err, page) {
      if (err) {
        callback(err);
        return;
      }

      page.setFn('onError', function (msg/*, trace*/) {
        // TODO: process trace

        // On js error - throw from phantom environment (will be catched by `evaluate` callback)
        throw  msg;
      }, function (err) {
        if (err) {
          callback(err);
          return;
        }

        page.set('viewportSize', { width: 1600, height: 900 }, function (err) {
          if (err) {
            callback(err);
            return;
          }

          self.__page__ = page;
          callback();
        });
      });
    });
  } ]);

  return this;
};


module.exports = Navit;
