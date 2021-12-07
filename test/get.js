'use strict';


const assert  = require('assert');
const express = require('express');
const path    = require('path');
const _       = require('lodash');
const fs      = require('fs');
const navit   = require('../');


describe('Navit.get.*', () => {
  let server;
  let browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345', engine: process.env.ENGINE });

    server = express()
      .use(express.static(path.join(__dirname, '..')))
      .listen(17345, err => {
        if (err) return done(err);
        // Init phantom before execute first test
        browser.then(done);
      });
  });

  describe('title', () => {
    it('with function', async () => {
      await browser
        .open('/test/fixtures/get/title.html')
        .get.title(title => assert.strictEqual(title, 'test title'));
    });

    it('with async function', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/get/title.html')
          .get.title(async title => {
            assert.strictEqual(title, 'test title');
            throw new Error('test-err');
          });
      }, /test-err/);
    });

    it('with array', async () => {
      var results = [];

      await browser
        .open('/test/fixtures/get/title.html')
        .get.title(results);

      assert.strictEqual(results[results.length - 1], 'test title');
    });
  });

  describe('url', () => {
    it('with function', async () => {
      await browser
        .open('/test/fixtures/get/url.html')
        .get.url(url => assert.strictEqual(url, 'http://localhost:17345/test/fixtures/get/url.html'));
    });

    it('with array', async () => {
      const results = [];

      await browser
        .open('/test/fixtures/get/url.html')
        .get.url(results);

      assert.strictEqual(results[results.length - 1], 'http://localhost:17345/test/fixtures/get/url.html');
    });
  });

  describe('count', () => {
    it('with function', async () => {
      await browser
        .open('/test/fixtures/get/count.html')
        .get.count('ul:first-child li', count => assert.strictEqual(count, 7));
    });

    it('with array', async () => {
      const results = [];

      await browser
        .open('/test/fixtures/get/count.html')
        .get.count('ul:first-child li', results);

      assert.strictEqual(results[results.length - 1], 7);
    });

    it('params as functions', async () => {
      await browser
        .open('/test/fixtures/get/count.html')
        .get.count(
          () => 'ul:first-child li',
          count => assert.strictEqual(count, 7)
        );
    });
  });

  describe('text', () => {
    it('with function', async () => {
      await browser
        .open('/test/fixtures/get/text.html')
        .get.text('#test-div', function (val) {
          assert.strictEqual(val, 'Here is HTML!');
        });
    });

    it('with array', async () => {
      var results = [];

      await browser
        .open('/test/fixtures/get/text.html')
        .get.text('#test-div', results);

      assert.strictEqual(results[results.length - 1], 'Here is HTML!');
    });

    it('params is functions', async () => {
      await browser
        .open('/test/fixtures/get/text.html')
        .get.text(
          () => '#test-div',
          val => assert.equal(val, 'Here is HTML!')
        );
    });
  });

  describe('html', () => {
    it('with function', async () => {
      await browser
        .open('/test/fixtures/get/html.html')
        .get.html('#test-div', val => assert.strictEqual(val, 'Here is <b>HTML</b>!'));
    });

    it('with array', async () => {
      var results = [];

      await browser
        .open('/test/fixtures/get/html.html')
        .get.html('#test-div', results);

      assert.strictEqual(results[results.length - 1], 'Here is <b>HTML</b>!');
    });

    it('params is functions', async () => {
      await browser
        .open('/test/fixtures/get/html.html')
        .get.html(
          () => '#test-div',
          val => assert.strictEqual(val, 'Here is <b>HTML</b>!')
        );
    });

    it('for whole page', async () => {
      // Equalize fixture & browser data by removing glitching elements
      function cleanup(src) {
        return src
          // 1. phantom add <html> even if not exists
          // 2. electron's emulator don't add this
          .replace(/<html[^>]*>|<\/html>/g, '')
          // slimer can do something strange
          .replace(/[\n ]/g, '');
      }

      let fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'get', 'html.html'), 'utf-8');

      await browser
        .open('/test/fixtures/get/html.html')
        .get.html(html => assert.strictEqual(cleanup(html), cleanup(fixture)));
    });
  });

  describe('attribute', () => {
    it('with function', async () => {
      await browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute('#test-div', 'data-test-attr',
          val => assert.strictEqual(val, 'test attr')
        );
    });

    it('with array', async () => {
      var results = [];

      await browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute('#test-div', 'data-test-attr', results);

      assert.strictEqual(results[results.length - 1], 'test attr');
    });

    it('params as functions', async () => {
      var results = [];

      await browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute(
          () => '#test-div',
          () => 'data-test-attr',
          results
        );

      assert.strictEqual(results[results.length - 1], 'test attr');
    });
  });

  it('cookies with function', async () => {
    await browser
      .open('/test/fixtures/get/cookies.html')
      .set.cookie('a', 'b')
      .get.cookies(cookies => {
        let cookie = _.find(cookies, cookie => cookie.name === 'a');

        assert.strictEqual(cookie.value, 'b');
      });
  });

  describe('evaluate', () => {
    it('evaluate with params', async () => {
      await browser
        .open('/test/fixtures/get/evaluate.html')
        .get.evaluate(function (a, b, c) {
          return a + b + c;
        }, 1, 2, 3, result => assert.strictEqual(result, 6));
    });

    it('evaluate without params', async () => {
      await browser
        .open('/test/fixtures/get/evaluate.html')
        .get.evaluate(function () {
          window.abc = 123;
        })
        .get.evaluate(function () {
          return window.abc;
        }, result => assert.strictEqual(result, 123));
    });
  });

  it('status', async () => {
    await browser
      .open('/test/fixtures/get/status.html')
      .get.status(st => assert.equal(st, 200));
  });

  it('headers', async () => {
    await browser
      .open('/test/fixtures/get/headers.html')
      .get.headers(headers => {
        assert.strictEqual(
          headers.find(h => h.name.toLowerCase() === 'x-powered-by').value,
          'Express'
        );
      });
  });

  it('value', async () => {
    await browser
      .open('/test/fixtures/get/value.html')
      .get.value(
        'input:first-child',
        value => assert.strictEqual(value, 'test value')
      );
  });

  after(async () => {
    server.close();
    await browser.exit();
  });
});
