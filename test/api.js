'use strict';

var assert  = require('chai').assert;
var express = require('express');
var path    = require('path');
var _       = require('lodash');
var navit   = require('../');
var helpers = require('./helpers');


var ENGINE = process.env.ENGINE;


describe('Navit api', function () {
  this.timeout(100000);
  var server;
  var browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345', engine: ENGINE });

    server = express()
      .use(express.static(path.join(__dirname, '..')))
      .listen(17345, function (err) {

        if (err) {
          done(err);
          return;
        }

        // Init phantom before execute first test
        browser.run(done);
      });
  });

  describe('.registerMethod', function () {
    it('should register function in one namespace', function () {
      var n = navit();

      n.registerMethod('test123', function () {
        return 'val';
      });

      assert.equal(n.test123(), 'val');
    });

    it('should remove function from one namespace', function () {
      var n = navit();

      n.registerMethod('test123', function () {
        return 'val';
      });

      // Remove
      n.registerMethod('test123');

      assert.throws(function () {
        n.test123();
      }, TypeError);
    });

    it('should register function in multi namespace', function () {
      var n = navit();

      n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ], function () {
        return 'val';
      });

      assert.equal(n.my.test.namespace.one.test123(), 'val');
      assert.equal(n.my.test.namespace.two.test123(), 'val');
    });

    it('should remove function from multi namespace', function () {
      var n = navit();

      n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ], function () {
        return 'val';
      });

      // Remove
      n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ]);

      assert.throws(function () {
        n.my.test.namespace.one.test123();
      }, TypeError);

      assert.throws(function () {
        n.my.test.namespace.two.test123();
      }, TypeError);
    });

    it('registered function should work in correct context', function () {
      var n = navit();

      n.testProperty = 'test value';

      n.registerMethod('test123', function () {
        return this.testProperty;
      });

      assert.equal(n.test123(), 'test value');
    });

    it('should register chain as function', function () {
      var n = navit();

      n.registerMethod('test123', function () {
        return '123';
      });

      n.registerMethod('test123.not', function () {
        return 'not123';
      });

      assert.equal(n.test123(), '123');
      assert.equal(n.test123.not(), 'not123');
    });

    it('should register remove function without', function () {
      var n = navit();

      n.registerMethod('test123', function () {
        return '123';
      });

      n.registerMethod('test123.not', function () {
        return 'not123';
      });

      // Remove
      n.registerMethod('test123');

      assert.throws(function () {
        n.test123();
      }, TypeError);

      assert.equal(n.test123.not(), 'not123');
    });
  });

  it('.batch', function (done) {
    browser.batch.create('test_batch', function () {
      this
        .open('/test/fixtures/api/batch.html')
        .set.cookie('batch', 'cookies');
    });

    browser
      .batch('test_batch')
      .get.cookies(function (val) {
        assert.equal(val[0].value, 'cookies');
      })
      .run(function (err) {
        done(err);
      });
  });

  describe('.fn', function () {
    it('async', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/api/fn.html')
        .get.text('body', results)
        .fn(function (a, b, c, next) {
          // Need trim because SlimerJS can add new line symbols at start and at end of body
          assert.equal(_.trim(results[0], '\n'), 'test text');
          assert.equal(a, 'a');
          assert.equal(b, 'b');
          assert.equal(c, 'c');

          next();
        }, 'a', 'b', 'c')
        .run(done);
    });

    it('sync', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/api/fn.html')
        .get.text('body', results)
        .fn(function (a, b, c) {
          // Need trim because SlimerJS can add new line symbols at start and at end of body
          assert.equal(_.trim(results[0], '\n'), 'test text');
          assert.equal(a, 'a');
          assert.equal(b, 'b');
          assert.equal(c, 'c');
        }, 'a', 'b', 'c')
        .run(done);
    });
  });

  it('.use', function () {
    browser
      .use(function (navit, a, b, c) {
        navit.registerMethod('use_test', function () {
          return a + b + c;
        });
      }, 'a', 'b', 'c');

    assert.equal(browser.use_test(), 'abc');
  });

  it('afterOpen', function (done) {
    browser.afterOpen = function () {
      this
        .set.cookie('ao', 'ao-test-cookies')
        .do.type('#ao-test', 'ao-test-type');
    };

    browser
      .open('/test/fixtures/api/after_open.html')
      .test.evaluate(function () {
        return document.querySelector('#ao-test').value === 'ao-test-type';
      })
      .get.cookies(function (cookies) {
        var cookie = _.find(cookies, function (cookie) {
          return cookie.name === 'ao';
        });

        assert.equal(cookie.value, 'ao-test-cookies');
      })
      .run(function (err) {
        browser.afterOpen = null;
        done(err);
      });
  });

  it('options.inject', function (done) {
    // workaround for utf8 in dir names for SlimeerJS
    var file = helpers.toTmp(path.join(__dirname, 'fixtures', 'api', 'inject.js'));

    var browser = navit({ inject: [
      file
    ], engine: ENGINE });

    browser
      .open('http://localhost:17345/test/fixtures/api/inject.html')
      .test.text('#html-from-js', 'html from js')
      .do.reload()
      .test.text('#html-from-js', 'html from js')
      .run(true, function (err) {
        helpers.unlink(file);
        done(err);
      });
  });

  it('engineOptions', function (done) {
    var browser = navit({ engine: ENGINE }, { loadImages: false });

    browser
      .open('http://localhost:17345/test/fixtures/api/engine_options.html')
      .get.evaluate(function () {
        return [ document.querySelector('img').clientWidth, document.querySelector('img').clientHeight ];
      }, function (size) {
        assert.notDeepEqual(size, [ 1, 1 ]);
      })
      .run(true, done);
  });

  after(function (done) {
    server.close();
    browser.close(done);
  });
});
