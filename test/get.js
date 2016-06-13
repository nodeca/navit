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
    it('with function', function () {
      return browser
        .open('/test/fixtures/get/title.html')
        .get.title(title => assert.equal(title, 'test title'));
    });

    it('with async function', function () {
      return browser
        .open('/test/fixtures/get/title.html')
        .get.title((title, next) => {
          assert.equal(title, 'test title');
          next('test-err');
        })
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err : '', 'test-err'); }
        );
    });

    it('with array', function () {
      var results = [];

      return browser
        .open('/test/fixtures/get/title.html')
        .get.title(results)
        .then(() => assert.equal(results[results.length - 1], 'test title'));
    });
  });

  describe('url', function () {
    it('with function', function () {
      return browser
        .open('/test/fixtures/get/url.html')
        .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/get/url.html'));
    });

    it('with array', function () {
      let results = [];

      return browser
        .open('/test/fixtures/get/url.html')
        .get.url(results)
        .then(() => assert.equal(results[results.length - 1], 'http://localhost:17345/test/fixtures/get/url.html'));
    });
  });

  describe('count', function () {
    it('with function', function () {
      return browser
        .open('/test/fixtures/get/count.html')
        .get.count('ul:first-child li', count => assert.equal(count, 7));
    });

    it('with array', function () {
      var results = [];

      return browser
        .open('/test/fixtures/get/count.html')
        .get.count('ul:first-child li', results)
        .then(() => assert.equal(results[results.length - 1], 7));
    });

    it('params as functions', function () {
      return browser
        .open('/test/fixtures/get/count.html')
        .get.count(function () {
          return 'ul:first-child li';
        }, count => assert.equal(count, 7));
    });
  });

  describe('text', function () {
    it('with function', function () {
      return browser
        .open('/test/fixtures/get/text.html')
        .get.text('#test-div', function (val) {
          assert.equal(val, 'Here is HTML!');
        });
    });

    it('with array', function () {
      var results = [];

      return browser
        .open('/test/fixtures/get/text.html')
        .get.text('#test-div', results)
        .then(() => assert.equal(results[results.length - 1], 'Here is HTML!'));
    });

    it('params is functions', function () {
      return browser
        .open('/test/fixtures/get/text.html')
        .get.text(function () {
          return '#test-div';
        }, val => assert.equal(val, 'Here is HTML!'));
    });
  });

  describe('html', function () {
    it('with function', function () {
      return browser
        .open('/test/fixtures/get/html.html')
        .get.html('#test-div', val => assert.equal(val, 'Here is <b>HTML</b>!'));
    });

    it('with array', function () {
      var results = [];

      return browser
        .open('/test/fixtures/get/html.html')
        .get.html('#test-div', results)
        .then(() => assert.equal(results[results.length - 1], 'Here is <b>HTML</b>!'));
    });

    it('params is functions', function () {
      return browser
        .open('/test/fixtures/get/html.html')
        .get.html(function () {
          return '#test-div';
        }, val => assert.equal(val, 'Here is <b>HTML</b>!'));
    });

    it.skip('for whole page', function () {
      let fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'get', 'html.html'), 'utf-8')
        .split(/[\n ]/)
        .join('');

      return browser
        .open('/test/fixtures/get/html.html')
        .get.html(html => assert.equal(html.split(/[\n ]/).join(''), fixture));
    });
  });

  describe('attribute', function () {
    it('with function', function () {
      return browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute('#test-div', 'data-test-attr',
          val => assert.equal(val, 'test attr')
        );
    });

    it('with array', function () {
      var results = [];

      return browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute('#test-div', 'data-test-attr', results)
        .then(() => assert.equal(results[results.length - 1], 'test attr'));
    });

    it('params as functions', function () {
      var results = [];

      return browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute(function () {
          return '#test-div';
        }, function () {
          return 'data-test-attr';
        }, results)
        .then(() => assert.equal(results[results.length - 1], 'test attr'));
    });
  });

  it('cookies with function', function () {
    return browser
      .open('/test/fixtures/get/cookies.html')
      .set.cookie('a', 'b')
      .get.cookies(cookies => {
        let cookie = _.find(cookies, cookie => cookie.name === 'a');

        assert.equal(cookie.value, 'b');
      });
  });

  describe('evaluate', function () {
    it('evaluate with params', function () {
      return browser
        .open('/test/fixtures/get/evaluate.html')
        .get.evaluate(function (a, b, c) {
          return a + b + c;
        }, 1, 2, 3, result => assert.equal(result, 6));
    });

    it('evaluate without params', function () {
      return browser
        .open('/test/fixtures/get/evaluate.html')
        .get.evaluate(function () {
          window.abc = 123;
        })
        .get.evaluate(function () {
          return window.abc;
        }, result => assert.equal(result, 123));
    });
  });

  it('status', function () {
    return browser
      .open('/test/fixtures/get/status.html')
      .get.status(st => assert.equal(st, 200));
  });

  it('headers', function () {
    return browser
      .open('/test/fixtures/get/headers.html')
      .get.headers(headers => {
        assert.equal(headers.find(h => h.name.toLowerCase() === 'x-powered-by').value,
          'Express');
      });
  });

  it('value', function () {
    return browser
      .open('/test/fixtures/get/value.html')
      .get.value(
        'input:first-child',
        value => assert.strictEqual(value, 'test value')
      );
  });

  after(function (done) {
    server.close();
    browser.exit(done);
  });
});
