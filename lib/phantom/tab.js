'use strict';


const debug      = require('debug')('navit');
const _          = require('lodash');
const NavitError = require('../error');
const unfunc     = require('../utils').unfunc;


let functions = [];


// Create and switch to new tab
//
functions.push([
  [ 'tab.open' ],
  function tab_open(url, options) {
    this.__queue__.push(function tab_open_step(callback) {
      debug('tab.open()');

      this.__initPage__(callback);
    });

    if (url) this.do.open(url, options);

    return this;
  }
]);


// Get tabs count
//
functions.push([
  [ 'tab.count' ],
  function tab_count(fn) {
    this.__queue__.push(function tab_count_step(callback) {
      debug('tab.count()');

      let result = this.__tabs__.length;

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
    this.__queue__.push(function tab_switch_step(callback) {
      let i = unfunc(index);

      debug(`tab.switch(${i}%d)`);

      if (i < 0) i = this.__tabs__.length + i;

      if (i < 0 || i >= this.__tabs__.length) {
        callback(new NavitError(`tab.switch('${i}') failed - index out of bounds`));
        return;
      }

      var tab = this.__tabs__[i];

      this.__tabIndex__ = i;
      this.__page__ = tab.page;
      this.__response__ = tab.response;

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
    this.__queue__.push(function tab_close_step(callback) {
      debug('tab.close()');

      let i = index ? unfunc(index) : this.__tabIndex__;

      // If we wont close current tab - switch to another before close
      if (i === this.__tabIndex__ && this.__tabs__.length !== 1) {
        var nextTabIndex;

        // If this is last tab - switch to previous (like in Chrome browser)
        if (i === this.__tabs__.length - 1) {
          nextTabIndex = i - 1;

        // If this is not last tab - switch to next (like in Chrome browser)
        } else {
          nextTabIndex = i + 1;
        }

        this.__tabIndex__ = nextTabIndex;
        this.__page__     = this.__tabs__[nextTabIndex].page;
        this.__response__ = this.__tabs__[nextTabIndex].response;
      }

      // Close tab
      this.__tabs__[i].page.close(err => {
        if (err) return callback(err);

        // Remove tab from tabs array
        this.__tabs__ = _.without(this.__tabs__, this.__tabs__[i]);
        // Update current tab index
        this.__tabIndex__ = _.findIndex(this.__tabs__,
          tab => tab.page === this.__page__);

        // If all tabs closed - open one new tab
        if (this.__tabIndex__ === -1) {
          this.__initPage__(callback);
          return;
        }

        callback();
      });
    });

    return this;
  }
]);


module.exports = functions;
