'use strict';


const assert  = require('assert');
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
        browser.then(done);
      });
  });

  describe('.registerMethod', () => {
    it('should register function in one namespace', () => {
      var n = navit();

      n.registerMethod('test123', () => 'val');

      assert.equal(n.test123(), 'val');
    });

    it('should remove function from one namespace', () => {
      var n = navit();

      n.registerMethod('test123', () => 'val');

      // Remove
      n.registerMethod('test123');

      assert.throws(() => n.test123(), TypeError);
    });

    it('should register function in multi namespace', () => {
      var n = navit();

      n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ], function () {
        return 'val';
      });

      assert.equal(n.my.test.namespace.one.test123(), 'val');
      assert.equal(n.my.test.namespace.two.test123(), 'val');
    });

    it('should remove function from multi namespace', () => {
      let n = navit();

      n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ], function () {
        return 'val';
      });

      // Remove
      n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ]);

      assert.throws(() => n.my.test.namespace.one.test123(), TypeError);
      assert.throws(() => n.my.test.namespace.two.test123(), TypeError);
    });

    it('registered function should work in correct context', () => {
      let n = navit();

      n.testProperty = 'test value';

      n.registerMethod('test123', function () {
        return this.testProperty;
      });

      assert.equal(n.test123(), 'test value');
    });

    it('should register chain as function', () => {
      var n = navit();

      n.registerMethod('test123',     () => '123');
      n.registerMethod('test123.not', () => 'not123');

      assert.equal(n.test123(), '123');
      assert.equal(n.test123.not(), 'not123');
    });

    it('should register remove function without', () => {
      var n = navit();

      n.registerMethod('test123',     () => '123');
      n.registerMethod('test123.not', () => 'not123');

      // Remove
      n.registerMethod('test123');

      assert.throws(() => n.test123(), TypeError);
      assert.equal(n.test123.not(), 'not123');
    });
  });

  it('.batch', async () => {
    browser.batch.create('test_batch', function () {
      this
        .open('/test/fixtures/api/batch.html')
        .set.cookie('batch', 'cookies');
    });

    await browser
      .batch('test_batch')
      .get.cookies(val => assert.equal(val[0].value, 'cookies'));
  });

  describe('.fn', () => {
    it('callback', async () => {
      let results = [];

      await browser
        .open('/test/fixtures/api/fn.html')
        .get.text('body', results)
        .fn((a, b, c, next) => {
          // Need trim because SlimerJS can add new line symbols at start and at end of body
          assert.equal(results[0].trim(), 'test text');
          assert.equal(a, 'a');
          assert.equal(b, 'b');
          assert.equal(c, 'c');

          next();
        }, 'a', 'b', 'c');
    });

    it('sync', async () => {
      var results = [];

      await browser
        .open('/test/fixtures/api/fn.html')
        .get.text('body', results)
        .fn((a, b, c) => {
          // Need trim because SlimerJS can add new line symbols at start and at end of body
          assert.equal(results[0].trim(), 'test text');
          assert.equal(a, 'a');
          assert.equal(b, 'b');
          assert.equal(c, 'c');
        }, 'a', 'b', 'c');
    });

    it('promise', async () => {
      var results = [];

      await browser
        .open('/test/fixtures/api/fn.html')
        .get.text('body', results)
        .fn(function (a, b, c) {
          // Need trim because SlimerJS can add new line symbols at start and at end of body
          assert.equal(results[0].trim(), 'test text');
          assert.equal(a, 'a');
          assert.equal(b, 'b');
          assert.equal(c, 'c');
          return Promise.resolve();
        }, 'a', 'b', 'c');
    });

    it('async', async () => {
      var results = [];

      await browser
        .open('/test/fixtures/api/fn.html')
        .get.text('body', results)
        .fn(async function (a, b, c) {
          // Need trim because SlimerJS can add new line symbols at start and at end of body
          assert.equal(results[0].trim(), 'test text');
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

  it('afterOpen', async () => {
    browser.afterOpen = function () {
      this
        .set.cookie('ao', 'ao-test-cookies')
        .do.type('#ao-test', 'ao-test-type');
    };

    await browser
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

  it('options.inject', async () => {
    // workaround for utf8 in dir names for SlimeerJS
    let file = helpers.toTmp(path.join(__dirname, 'fixtures', 'api', 'inject.js'));

    let browser = navit({ inject: [ file ], engine: ENGINE });

    await browser
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

  it('engineOptions', async () => {
    let browser = navit({ engine: ENGINE }, { loadImages: false });

    await browser
      .open('http://localhost:17345/test/fixtures/api/engine_options.html')
      .get.evaluate(function () {
        return [ document.querySelector('img').clientWidth, document.querySelector('img').clientHeight ];
      }, size => assert.notDeepEqual(size, [ 1, 1 ]))
      .close();
  });

  it('enginePath', async () => {
    let enginePath;
    let engine = ENGINE || 'electron';

    switch (engine) {
      case 'electron':
        enginePath = require('electron');
        break;
      default:
        throw new Error('unknown engine name');
    }

    let browser = navit({ engine, enginePath });

    await browser
      .open('http://localhost:17345/test/fixtures/api/close.html')
      .test.evaluate(function () {
        return document.querySelector('#test').value === 'foobar';
      })
      .close();
  });

  it('.close', async () => {
    // check that server automatically restarts when you close it midway
    await browser
      .close()
      .open('/test/fixtures/api/close.html')
      .test.evaluate(function () {
        return document.querySelector('#test').value === 'foobar';
      });
  });

  after(async () => {
    server.close();
    await browser.exit();
  });
});
