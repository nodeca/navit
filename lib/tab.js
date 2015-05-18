'use strict';


var format     = require('util').format;
var _          = require('lodash');
var NavitError = require('./error');


var functions = [];


// Create and switch to new tab
//
functions.push([
  [ 'tab.open' ],
  function tab_open(url, options) {
    var self = this;

    this.__queue__.push(function tab_open_step(callback) {
      self.__initPage__(callback);
    });

    if (url) {
      self.do.open(url, options);
    }

    return this;
  }
]);


// Get tabs count
//
functions.push([
  [ 'tab.count' ],
  function tab_count(fn) {
    var self = this;

    this.__queue__.push(function tab_count_step(callback) {
      var result = self.__tabs__.length;

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
    });

    return this;
  }
]);


// Switch to tab
//
functions.push([
  [ 'tab.switch' ],
  function tab_switch(index) {
    var self = this;

    this.__queue__.push(function tab_switch_step(callback) {
      var i = _.isFunction(index) ? index() : index;

      if (i < 0 || i >= self.__tabs__.length) {
        callback(new NavitError(format("tab.switch('%s') failed - index out of bounds", i)));
      }

      var tab = self.__tabs__[i];

      self.__tabIndex__ = i;
      self.__page__ = tab.page;
      self.__response__ = tab.response;

      callback();
    });

    return this;
  }
]);


// Close tab by `index` or close current tab
//
functions.push([
  [ 'tab.close' ],
  function tab_close(index) {
    var self = this;

    this.__queue__.push(function tab_close_step(callback) {
      // If no more opened tabs - do nothing
      if (self.__tabs__.length === 1) {
        callback();
        return;
      }

      var i;

      if (index) {
        i = _.isFunction(index) ? index() : index;
      } else {
        i = self.__tabIndex__;
      }

      // If we wont close current tab - switch to another before close
      if (i === self.__tabIndex__) {
        var nextTabIndex;

        // If this is last tab - switch to previous (like in Chrome browser)
        if (i === self.__tabs__.length - 1) {
          nextTabIndex = i - 1;

        // If this is not last tab - switch to next (like in Chrome browser)
        } else {
          nextTabIndex = i + 1;
        }

        self.__tabIndex__ = nextTabIndex;
        self.__page__ = self.__tabs__[nextTabIndex].page;
        self.__response__ = self.__tabs__[nextTabIndex].response;
      }

      // Close tab
      self.__tabs__[i].page.close(function (err) {
        if (err) {
          callback(err);
          return;
        }

        // Remove tab from tabs array
        self.__tabs__ = _.without(self.__tabs__, self.__tabs__[i]);
        callback();
      });
    });

    return this;
  }
]);


module.exports = functions;
