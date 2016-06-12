'use strict';


const assert  = require('chai').assert;
const express = require('express');
const path    = require('path');
const navit   = require('../');


describe('Navit.test.*', function () {
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

  describe('text', function () {
    it('positive', function (done) {
      browser
          .open('/test/fixtures/test/text.html')
          .test.text('ul:first-child li:nth-child(2)', 'two')
          .run(done);
    });

    it('negative', function (done) {
      browser
        .open('/test/fixtures/test/text.html')
        .test.text('ul:first-child li:nth-child(2)', 'five')
        .run(err => {
          assert.equal(err ? err.name : '', 'AssertionError');
          done();
        });
    });

    it('negative RegExp', function (done) {
      browser
        .open('/test/fixtures/test/text.html')
        .test.text('ul:first-child li:nth-child(2)', /five/)
        .run(err => {
          assert.equal(err ? err.name : '', 'AssertionError');
          done();
        });
    });

    it('.not positive', function (done) {
      browser
        .open('/test/fixtures/test/text.html')
        .test.text.not('ul:first-child li:nth-child(2)', 'five')
        .run(done);
    });

    it('.not negative', function (done) {
      browser
        .open('/test/fixtures/test/text.html')
        .test.text.not('ul:first-child li:nth-child(2)', 'two')
        .run(err => {
          assert.equal(err ? err.name : '', 'AssertionError');
          done();
        });
    });
  });

  describe('count', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/count.html')
        .test.count('ul:first-child li', 7)
        .run(done);
    });

    it('negative', function (done) {
      browser
        .open('/test/fixtures/test/count.html')
        .test.count('ul:first-child li', 9)
        .run(err => {
          assert.equal(err ? err.name : '', 'AssertionError');
          done();
        });
    });

    it('.not positive', function (done) {
      browser
        .open('/test/fixtures/test/count.html')
        .test.count.not('ul:first-child li', 9)
        .run(done);
    });

    it('.not negative', function (done) {
      browser
        .open('/test/fixtures/test/count.html')
        .test.count.not('ul:first-child li', 7)
        .run(err => {
          assert.equal(err ? err.name : '', 'AssertionError');
          done();
        });
    });

    it('.not negative with message', function (done) {
      browser
        .open('/test/fixtures/test/count.html')
        .test.count.not('ul:first-child li', 7, 'li count wrong')
        .run(err => {
          assert.equal(err ? err.toString() : '', 'AssertionError: li count wrong: expected 7 to not equal 7');
          done();
        });
    });
  });

  describe('title', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/title.html')
        .test.title('test title')
        .run(done);
    });

    it('.not positive', function (done) {
      browser
        .open('/test/fixtures/test/title.html')
        .test.title.not('something else')
        .run(done);
    });
  });

  describe('url', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/url.html')
        .test.url('http://localhost:17345/test/fixtures/test/url.html')
        .run(done);
    });

    it('.not positive', function (done) {
      browser
        .open('/test/fixtures/test/url.html')
        .test.url.not('something else')
        .run(done);
    });
  });

  describe('attribute', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/attribute.html')
        .test.attribute('#test-div', 'data-test-attr', 'test attr')
        .run(done);
    });

    it('.not positive', function (done) {
      browser
        .open('/test/fixtures/test/attribute.html')
        .test.attribute.not('#test-div', 'data-test-attr', 'something else')
        .run(done);
    });
  });

  describe('exists', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/exists.html')
        .test.exists('#test-div')
        .run(done);
    });

    it('.not positive', function (done) {
      browser
        .open('/test/fixtures/test/exists.html')
        .test.not.exists('#no-existing-test-div')
        .run(done);
    });
  });

  describe('exists', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/exists.html')
        .test.exists('#test-div')
        .run(done);
    });

    it('.not positive', function (done) {
      browser
        .open('/test/fixtures/test/exists.html')
        .test.not.exists('#no-existing-test-div')
        .run(done);
    });
  });

  describe('visible', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/visible.html')
        .test.visible('#visible-div')
        .run(done);
    });

    it('.not positive', function (done) {
      browser
        .open('/test/fixtures/test/visible.html')
        .test.not.visible('#invisible-div')
        .run(done);
    });
  });

  describe('evaluate', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/evaluate.html')
        .test.evaluate(function (a, b, c) {
          return a + b + c === 6;
        }, 1, 2, 3)
        .run(done);
    });

    it('negative', function (done) {
      browser
        .open('/test/fixtures/test/evaluate.html')
        .test.evaluate(function (a, b, c) {
          return a + b + c === 7;
        }, 1, 2, 3, 'test msg')
        .run(err => {
          assert.equal(err ? err.toString() : '', 'AssertionError: test msg: expected false to equal true');
          done();
        });
    });
  });

  describe.skip('status', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/status.html')
        .test.status(200)
        .run(done);
    });

    it('negative', function (done) {
      browser
        .open('/test/fixtures/test/status.html')
        .test.status(404)
        .run(function (err) {
          assert.equal(err ? err.toString() : '', 'AssertionError: test.status() failed: expected 200 to equal 404');
          done();
        });
    });
  });

  describe.skip('header', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/header.html')
        .test.header('X-Powered-By', 'Express')
        .run(done);
    });

    it('negative', function (done) {
      browser
        .open('/test/fixtures/test/header.html')
        .test.header('X-Powered-By', 'foobar')
        .run(err => {
          assert.equal(
            err.toString(),
            'AssertionError: test.header(\'X-Powered-By\') failed: expected \'Express\' to equal \'foobar\''
          );
          done();
        });
    });
  });

  describe.skip('body.not', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/body.html')
        .test.body.not(/bla bla/)
        .run(done);
    });

    it('negative', function (done) {
      browser
        .open('/test/fixtures/test/body.html')
        .test.body.not(/test text/)
        .run(err => {
          assert.equal(err ? err.name : '', 'AssertionError');
          done();
        });
    });
  });

  describe.skip('sugar', function () {
    it('status', function (done) {
      browser
        .open('/test/fixtures/test/status.html')
        .test(200)
        .run(done);
    });

    it('header', function (done) {
      browser
        .open('/test/fixtures/test/header.html')
        .test('X-Powered-By', 'Express')
        .run(done);
    });

    it('body', function (done) {
      browser
        .open('/test/fixtures/test/body.html')
        .test(/test text/)
        .run(done);
    });
  });

  describe('value', function () {
    it('positive', function (done) {
      browser
        .open('/test/fixtures/test/value.html')
        .test.value('input', 'test value')
        .run(done);
    });

    it('negative', function (done) {
      browser
        .open('/test/fixtures/test/value.html')
        .test.value('input', 'not test value')
        .run(err => {
          assert.equal(err ? err.name : '', 'AssertionError');
          done();
        });
    });

    it('.not positive', function (done) {
      browser
        .open('/test/fixtures/test/value.html')
        .test.value.not('input', 'not test value')
        .run(done);
    });

    it('.not negative', function (done) {
      browser
        .open('/test/fixtures/test/value.html')
        .test.value.not('input', 'test value')
        .run(err => {
          assert.equal(err ? err.name : '', 'AssertionError');
          done();
        });
    });
  });

  after(function (done) {
    server.close();
    browser.close(done);
  });
});
