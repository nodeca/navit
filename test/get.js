'use strict';


const assert  = require('chai').assert;
const express = require('express');
const path    = require('path');
const _       = require('lodash');
const fs      = require('fs');
const navit   = require('../');


describe('Navit.get.*', function () {
  let server;
  let browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345', engine: process.env.ENGINE });

    server = express()
      .use(express.static(path.join(__dirname, '..')))
      .listen(17345, err => {
        if (err) return done(err);
        // Init phantom before execute first test
        browser.run(done);
      });
  });

  describe('title', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/title.html')
        .get.title(title => assert.equal(title, 'test title'))
        .run(done);
    });

    it('with async function', function (done) {
      browser
        .open('/test/fixtures/get/title.html')
        .get.title((title, next) => {
          assert.equal(title, 'test title');
          next('test-err');
        })
        .run(err => {
          assert.equal(err ? err : '', 'test-err');
          done();
        });
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/title.html')
        .get.title(results)
        .run(err => {
          if (err) return done(err);

          assert.equal(results[results.length - 1], 'test title');
          done();
        });
    });
  });

  describe('url', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/url.html')
        .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/get/url.html'))
        .run(done);
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/url.html')
        .get.url(results)
        .run(err => {
          if (err) return done(err);

          assert.equal(results[results.length - 1], 'http://localhost:17345/test/fixtures/get/url.html');
          done();
        });
    });
  });

  describe('count', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/count.html')
        .get.count('ul:first-child li', count => assert.equal(count, 7))
        .run(done);
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/count.html')
        .get.count('ul:first-child li', results)
        .run(err => {
          if (err) return done(err);

          assert.equal(results[results.length - 1], 7);
          done();
        });
    });

    it('params as functions', function (done) {
      browser
        .open('/test/fixtures/get/count.html')
        .get.count(function () {
          return 'ul:first-child li';
        }, count => assert.equal(count, 7))
        .run(done);
    });
  });

  describe('text', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/text.html')
        .get.text('#test-div', function (val) {
          assert.equal(val, 'Here is HTML!');
        })
        .run(done);
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/text.html')
        .get.text('#test-div', results)
        .run(err => {
          if (err) return done(err);

          assert.equal(results[results.length - 1], 'Here is HTML!');
          done();
        });
    });

    it('params is functions', function (done) {
      browser
        .open('/test/fixtures/get/text.html')
        .get.text(function () {
          return '#test-div';
        }, val => assert.equal(val, 'Here is HTML!'))
        .run(done);
    });
  });

  describe('html', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/html.html')
        .get.html('#test-div', val => assert.equal(val, 'Here is <b>HTML</b>!'))
        .run(done);
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/html.html')
        .get.html('#test-div', results)
        .run(err => {
          if (err) return done(err);

          assert.equal(results[results.length - 1], 'Here is <b>HTML</b>!');
          done();
        });
    });

    it('params is functions', function (done) {
      browser
        .open('/test/fixtures/get/html.html')
        .get.html(function () {
          return '#test-div';
        }, val => assert.equal(val, 'Here is <b>HTML</b>!'))
        .run(done);
    });

    it.skip('for whole page', function (done) {
      var fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'get', 'html.html'), 'utf-8')
        .split(/[\n ]/)
        .join('');

      browser
        .open('/test/fixtures/get/html.html')
        .get.html(html => assert.equal(html.split(/[\n ]/).join(''), fixture))
        .run(done);
    });
  });

  describe('attribute', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute('#test-div', 'data-test-attr',
          val => assert.equal(val, 'test attr')
        )
        .run(done);
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute('#test-div', 'data-test-attr', results)
        .run(err => {
          if (err) return done(err);

          assert.equal(results[results.length - 1], 'test attr');
          done();
        });
    });

    it('params as functions', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute(function () {
          return '#test-div';
        }, function () {
          return 'data-test-attr';
        }, results)
        .run(err => {
          if (err) return done(err);

          assert.equal(results[results.length - 1], 'test attr');
          done();
        });
    });
  });

  it('cookies with function', function (done) {
    browser
      .open('/test/fixtures/get/cookies.html')
      .set.cookie('a', 'b')
      .get.cookies(cookies => {
        let cookie = _.find(cookies, cookie => cookie.name === 'a');

        assert.equal(cookie.value, 'b');
      })
      .run(done);
  });

  describe('evaluate', function () {
    it('evaluate with params', function (done) {
      browser
        .open('/test/fixtures/get/evaluate.html')
        .get.evaluate(function (a, b, c) {
          return a + b + c;
        }, 1, 2, 3, result => assert.equal(result, 6))
        .run(done);
    });

    it('evaluate without params', function (done) {
      browser
        .open('/test/fixtures/get/evaluate.html')
        .get.evaluate(function () {
          window.abc = 123;
        })
        .get.evaluate(function () {
          return window.abc;
        }, result => assert.equal(result, 123))
        .run(done);
    });
  });

  it.skip('status', function (done) {
    browser
      .open('/test/fixtures/get/status.html')
      .get.status(st => assert.equal(st, 200))
      .run(done);
  });

  it('value', function (done) {
    browser
      .open('/test/fixtures/get/value.html')
      .get.value(
        'input:first-child',
        value => assert.strictEqual(value, 'test value')
      )
      .run(done);
  });

  after(function (done) {
    server.close();
    browser.close(done);
  });
});
