'use strict';


var _ = require('lodash');


var functions = [];


// Get page title
//
functions.push([
  [ 'title', 'get.title' ],
  function (fn) {
    this.__queue__.push([ [ fn ], function title(fn, callback) {
      this.__page__.get('title', function (err, title) {
        if (err) {
          callback(err);
          return;
        }

        // If `fn` is array - push result
        if (_.isArray(fn)) {
          fn.push(title);
          callback();
          return;
        }

        callback(fn(title));
      });
    } ]);

    return this;
  }
]);


// Get current page url
//
functions.push([
  [ 'url', 'get.url' ],
  function (fn) {
    this.__queue__.push([ [ fn ], function url(fn, callback) {
      this.__page__.get('url', function (err, url) {
        if (err) {
          callback(err);
          return;
        }

        // If `cb` is array - push result
        if (_.isArray(fn)) {
          fn.push(url);
          callback();
          return;
        }

        callback(fn(url));
      });
    } ]);

    return this;
  }
]);


// Get elements count
//
functions.push([
  [ 'count', 'get.count' ],
  function (selector, fn) {
    this.__queue__.push([ [ selector, fn ], function count(selector, fn, callback) {
      this.__page__.evaluate(function (selector) {
        return document.querySelectorAll(selector).length;
      }, function (err, count) {
        if (err) {
          callback(err);
          return;
        }

        // If `cb` is array - push result
        if (_.isArray(fn)) {
          fn.push(count);
          callback();
          return;
        }

        callback(fn(count));
      }, selector);
    } ]);

    return this;
  }
]);


// Get element text
//
functions.push([
  [ 'text', 'get.text' ],
  function (selector, fn) {
    this.__queue__.push([ [ selector, fn ], function text(selector, fn, callback) {
      this.__page__.evaluate(function (selector) {
        return document.querySelector(selector).innerText;
      }, function (err, text) {
        if (err) {
          callback(err);
          return;
        }

        // If `cb` is array - push result
        if (_.isArray(fn)) {
          fn.push(text);
          callback();
          return;
        }

        callback(fn(text));
      }, selector);
    } ]);

    return this;
  }
]);


// Get element html
//
functions.push([
  [ 'html', 'get.html' ],
  function (selector, fn) {
    if (!fn) {
      fn = selector;
      selector = null;
    }

    this.__queue__.push([ [ selector, fn ], function html(selector, fn, callback) {
      if (!selector) {
        this.__page__.get('content', function (err, html) {
          if (err) {
            callback(err);
            return;
          }

          fn(html);
          callback();
        });
        return;
      }

      this.__page__.evaluate(function (selector) {
        return document.querySelector(selector).innerHTML;
      }, function (err, html) {
        if (err) {
          callback(err);
          return;
        }

        // If `cb` is array - push result
        if (_.isArray(fn)) {
          fn.push(html);
          callback();
          return;
        }

        callback(fn(html));
      }, selector);
    } ]);

    return this;
  }
]);


// Get element attribute
//
functions.push([
  [ 'attribute', 'get.attribute' ],
  function (selector, attribute, fn) {
    this.__queue__.push([ [ selector, attribute, fn ], function attribute(selector, attribute, fn, callback) {
      this.__page__.evaluate(function (selector, attribute) {
        return document.querySelector(selector).getAttribute(attribute);
      }, function (err, attr) {
        if (err) {
          callback(err);
          return;
        }

        // If `cb` is array - push result
        if (_.isArray(fn)) {
          fn.push(attr);
          callback();
          return;
        }

        callback(fn(attr));
      }, selector, attribute);
    } ]);

    return this;
  }
]);


// Get page body
//
functions.push([
  [ 'get.body' ],
  function (fn) {
    this.get.html('body', fn);

    return this;
  }
]);


// Get cookies
//
functions.push([
  [ 'get.cookies' ],
  function (fn) {
    this.__queue__.push([ [ fn ], function cookies(fn, callback) {
      this.__page__.get('cookies', function (err, cookies) {
        if (err) {
          callback(err);
          return;
        }

        // If `fn` is array - push result
        if (_.isArray(fn)) {
          fn.push(cookies);
          callback();
          return;
        }

        callback(fn(cookies));
      });
    } ]);

    return this;
  }
]);


module.exports = functions;
