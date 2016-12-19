'use strict';


const assert  = require('chai').assert;
const express = require('express');
const path    = require('path');
const _       = require('lodash');
const navit   = require('../');
const helpers = require('./helpers');


const ENGINE = process.env.ENGINE;


describe('Navit api', function () {
  this.timeout(100000);
  let server;
  let browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345', engine: ENGINE });

    server = express()
      .use(express.static(path.join(__dirname, '..')))
      .listen(17345, err => {
        if (err) return done(err);
        // Init engine before execute first test
        browser.run(done);
      });
  });

  describe('.registerMethod', function () {
    it('should register function in one namespace', function () {
      var n = navit();

      n.registerMethod('test123', () => 'val');

      assert.equal(n.test123(), 'val');
    });

    it('should remove function from one namespace', function () {
      var n = navit();

      n.registerMethod('test123', () => 'val');

      // Remove
      n.registerMethod('test123');

      assert.throws(() => n.test123(), TypeError);
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
      let n = navit();

      n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ], function () {
        return 'val';
      });

      // Remove
      n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ]);

      assert.throws(() => n.my.test.namespace.one.test123(), TypeError);
      assert.throws(() => n.my.test.namespace.two.test123(), TypeError);
    });

    it('registered function should work in correct context', function () {
      let n = navit();

      n.testProperty = 'test value';

      n.registerMethod('test123', function () {
        return this.testProperty;
      });

      assert.equal(n.test123(), 'test value');
    });

    it('should register chain as function', function () {
      var n = navit();

      n.registerMethod('test123',     () => '123');
      n.registerMethod('test123.not', () => 'not123');

      assert.equal(n.test123(), '123');
      assert.equal(n.test123.not(), 'not123');
    });

    it('should register remove function without', function () {
      var n = navit();

      n.registerMethod('test123',     () => '123');
      n.registerMethod('test123.not', () => 'not123');

      // Remove
      n.registerMethod('test123');

      assert.throws(() => n.test123(), TypeError);
      assert.equal(n.test123.not(), 'not123');
    });
  });

  it('.batch', function () {
    browser.batch.create('test_batch', function () {
      this
        .open('/test/fixtures/api/batch.html')
        .set.cookie('batch', 'cookies');
    });

    return browser
      .batch('test_batch')
      .get.cookies(val => assert.equal(val[0].value, 'cookies'));
  });

  describe('.fn', function () {
    it('async', function () {
      let results = [];

      return browser
        .open('/test/fixtures/api/fn.html')
        .get.text('body', results)
        .fn((a, b, c, next) => {
          // Need trim because SlimerJS can add new line symbols at start and at end of body
          assert.equal(_.trim(results[0], '\n'), 'test text');
          assert.equal(a, 'a');
          assert.equal(b, 'b');
          assert.equal(c, 'c');

          next();
        }, 'a', 'b', 'c');
    });

    it('sync', function () {
      var results = [];

      return browser
        .open('/test/fixtures/api/fn.html')
        .get.text('body', results)
        .fn((a, b, c) => {
          // Need trim because SlimerJS can add new line symbols at start and at end of body
          assert.equal(_.trim(results[0], '\n'), 'test text');
          assert.equal(a, 'a');
          assert.equal(b, 'b');
          assert.equal(c, 'c');
        }, 'a', 'b', 'c');
    });
  });

  it('.use', function () {
    browser
      .use(function (navit, a, b, c) {
        navit.registerMethod('use_test', () => a + b + c);
      }, 'a', 'b', 'c');

    assert.equal(browser.use_test(), 'abc');
  });

  it('afterOpen', function () {
    browser.afterOpen = function () {
      this
        .set.cookie('ao', 'ao-test-cookies')
        .do.type('#ao-test', 'ao-test-type');
    };

    return browser
      .open('/test/fixtures/api/after_open.html')
      .test.evaluate(function () {
        return document.querySelector('#ao-test').value === 'ao-test-type';
      })
      .get.cookies(cookies => {
        let cookie = _.find(cookies, cookie => cookie.name === 'ao');

        assert.equal(cookie.value, 'ao-test-cookies');
      })
      .then(
        () => { browser.afterOpen = null; },
        err => { browser.afterOpen = null; throw err; }
      );
  });

  it('options.inject', function () {
    // workaround for utf8 in dir names for SlimeerJS
    let file = helpers.toTmp(path.join(__dirname, 'fixtures', 'api', 'inject.js'));

    let browser = navit({ inject: [
      file
    ], engine: ENGINE });

    return browser
      .open('http://localhost:17345/test/fixtures/api/inject.html')
      .test.text('#html-from-js', 'html from js')
      .do.reload()
      .test.text('#html-from-js', 'html from js')
      .close()
      .then(
        () => { helpers.unlink(file); },
        err => { helpers.unlink(file); throw err; }
      );
  });

  it('engineOptions', function () {
    let browser = navit({ engine: ENGINE }, { loadImages: false });

    return browser
      .open('http://localhost:17345/test/fixtures/api/engine_options.html')
      .get.evaluate(function () {
        return [ document.querySelector('img').clientWidth, document.querySelector('img').clientHeight ];
      }, size => assert.notDeepEqual(size, [ 1, 1 ]))
      .close();
  });

  it.only('enginePath', function () {
    let enginePath;
    let engine = ENGINE || 'phantomjs';

    switch (engine) {
      case 'phantomjs':
        enginePath = require('phantomjs-prebuilt').path;
        break;
      case 'slimerjs':
        enginePath = require('slimerjs').path;
        break;
      case 'electron':
        enginePath = require('electron');
        break;
      default:
        throw new Error('unknown engine name');
    }

    let browser = navit({ engine, enginePath });

    return browser
      .open('http://localhost:17345/test/fixtures/api/close.html')
      .test.evaluate(function () {
        return document.querySelector('#test').value === 'foobar';
      })
      .close();
  });

  it('.close', function () {
    // check that server automatically restarts when you close it midway
    return browser
      .close()
      .open('/test/fixtures/api/close.html')
      .test.evaluate(function () {
        return document.querySelector('#test').value === 'foobar';
      })
      .run();
  });

  describe('.run', function () {
    // regression test: check that callback is called on teardown
    it('teardown', function (callback) {
      browser
        .open('/test/fixtures/api/run.html')
        .run(true, callback);
    });

    it('no teardown', function (callback) {
      browser
        .open('/test/fixtures/api/run.html')
        .run(false, callback);
    });
  });

  after(function (done) {
    server.close();
    browser.exit(done);
  });
});
