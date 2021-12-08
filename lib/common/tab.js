'use strict';


const debug      = require('debug')('navit');
const NavitError = require('../error');
const { unfunc, isFunction } = require('../utils');


let functions = [];


// Create and switch to new tab
//
functions.push([
  [ 'tab.open' ],
  function tab_open(url, options) {
    this.__queue__.push(async function tab_open_step() {
      debug('tab.open()');

      await this.__initPage__();
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
    this.__queue__.push(async function tab_count_step() {
      debug('tab.count()');

      let result = this.__tabs__.length;

      // If `fn` is array - push result
      if (Array.isArray(fn)) {
        fn.push(result);
        return;
      }

      if (!isFunction(fn) || fn.length !== 1) {
        throw new NavitError("'fn' param should be a function with one argument");
      }

      await fn(result);
    });

    return this;
  }
]);


// Switch to tab
//
functions.push([
  [ 'tab.switch' ],
  function tab_switch(index) {
    this.__queue__.push(async function tab_switch_step() {
      let i = unfunc(index);

      debug(`tab.switch(${i}%d)`);

      if (i < 0) i = this.__tabs__.length + i;

      if (i < 0 || i >= this.__tabs__.length) {
        throw new NavitError(`tab.switch('${i}') failed - index out of bounds`);
      }

      let tab = this.__tabs__[i];

      this.__tabIndex__ = i;
      this.__page__ = tab.page;
      this.__response__ = tab.response;
    });

    return this;
  }
]);


// Close tab by `index` or close current tab
//
functions.push([
  [ 'tab.close' ],
  function tab_close(index) {
    this.__queue__.push(async function tab_close_step() {
      debug('tab.close()');

      let i = index ? unfunc(index) : this.__tabIndex__;

      // If we wont close current tab - switch to another before close
      if (i === this.__tabIndex__ && this.__tabs__.length !== 1) {
        let nextTabIndex;

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
      await this.__tabs__[i].page.close();

      // Remove tab from tabs array
      this.__tabs__ = this.__tabs__.filter(t => t !== this.__tabs__[i]);
      // Update current tab index
      this.__tabIndex__ = this.__tabs__.findIndex(t => t.page === this.__page__);

      // ** now tabs are auto-created in runner on each step
      // If all tabs closed - open one new tab
      // if (this.__tabIndex__ === -1) {
      //   await this.__initPage__();
      //   return;
      // }
      if (this.__tabIndex__ === -1) {
        this.__page__     = null;
        this.__response__ = null;
      }
    });

    return this;
  }
]);


module.exports = functions;
