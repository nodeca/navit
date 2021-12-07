'use strict';


const assert  = require('assert');
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
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/text.html')
        .test.text('ul:first-child li:nth-child(2)', 'two');
    });

    it('negative', function () {
      return browser
        .open('/test/fixtures/test/text.html')
        .test.text('ul:first-child li:nth-child(2)', 'five')
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'AssertionError'); }
        );
    });

    it('negative RegExp', function () {
      return browser
        .open('/test/fixtures/test/text.html')
        .test.text('ul:first-child li:nth-child(2)', /five/)
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'AssertionError'); }
        );
    });

    it('.not positive', function () {
      return browser
        .open('/test/fixtures/test/text.html')
        .test.text.not('ul:first-child li:nth-child(2)', 'five');
    });

    it('.not negative', function () {
      return browser
        .open('/test/fixtures/test/text.html')
        .test.text.not('ul:first-child li:nth-child(2)', 'two')
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'AssertionError'); }
        );
    });
  });

  describe('count', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/count.html')
        .test.count('ul:first-child li', 7);
    });

    it('negative', function () {
      return browser
        .open('/test/fixtures/test/count.html')
        .test.count('ul:first-child li', 9)
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'AssertionError'); }
        );
    });

    it('.not positive', function () {
      return browser
        .open('/test/fixtures/test/count.html')
        .test.count.not('ul:first-child li', 9);
    });

    it('.not negative', function () {
      return browser
        .open('/test/fixtures/test/count.html')
        .test.count.not('ul:first-child li', 7)
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'AssertionError'); }
        );
    });

    it('.not negative with message', function () {
      return browser
        .open('/test/fixtures/test/count.html')
        .test.count.not('ul:first-child li', 7, 'li count wrong')
        .then(
          () => { throw new Error('Error should happen'); },
          err => {
            assert.equal(
              err ? err.toString() : '',
              'AssertionError: li count wrong: expected 7 to not equal 7'
            );
          }
        );
    });
  });

  describe('title', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/title.html')
        .test.title('test title');
    });

    it('.not positive', function () {
      return browser
        .open('/test/fixtures/test/title.html')
        .test.title.not('something else');
    });
  });

  describe('url', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/url.html')
        .test.url('http://localhost:17345/test/fixtures/test/url.html');
    });

    it('.not positive', function () {
      return browser
        .open('/test/fixtures/test/url.html')
        .test.url.not('something else');
    });
  });

  describe('attribute', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/attribute.html')
        .test.attribute('#test-div', 'data-test-attr', 'test attr');
    });

    it('.not positive', function () {
      return browser
        .open('/test/fixtures/test/attribute.html')
        .test.attribute.not('#test-div', 'data-test-attr', 'something else');
    });
  });

  describe('exists', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/exists.html')
        .test.exists('#test-div');
    });

    it('.not positive', function () {
      return browser
        .open('/test/fixtures/test/exists.html')
        .test.not.exists('#no-existing-test-div');
    });
  });

  describe('exists', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/exists.html')
        .test.exists('#test-div');
    });

    it('.not positive', function () {
      return browser
        .open('/test/fixtures/test/exists.html')
        .test.not.exists('#no-existing-test-div');
    });
  });

  describe('visible', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/visible.html')
        .test.visible('#visible-div');
    });

    it('.not positive', function () {
      return browser
        .open('/test/fixtures/test/visible.html')
        .test.not.visible('#invisible-div');
    });
  });

  describe('evaluate', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/evaluate.html')
        .test.evaluate(function (a, b, c) {
          return a + b + c === 6;
        }, 1, 2, 3);
    });

    it('negative', function () {
      return browser
        .open('/test/fixtures/test/evaluate.html')
        .test.evaluate(function (a, b, c) {
          return a + b + c === 7;
        }, 1, 2, 3, 'test msg')
        .then(
          () => { throw new Error('Error should happen'); },
          err => {
            assert.equal(
              err ? err.toString() : '',
              'AssertionError: test msg: expected false to equal true'
            );
          }
        );
    });
  });

  describe('status', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/status.html')
        .test.status(200);
    });

    it('negative', function () {
      return browser
        .open('/test/fixtures/test/status.html')
        .test.status(404)
        .then(
          () => { throw new Error('Error should happen'); },
          err => {
            assert.equal(
              err ? err.toString() : '',
              'AssertionError: test.status(404) failed: expected 200 to equal 404'
            );
          }
        );
    });
  });

  describe('header', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/header.html')
        .test.header('X-Powered-By', 'Express');
    });

    it('negative', function () {
      return browser
        .open('/test/fixtures/test/header.html')
        .test.header('X-Powered-By', 'foobar')
        .then(
          () => { throw new Error('Error should happen'); },
          err => {
            assert.equal(
              err ? err.toString() : '',
              "AssertionError: test.header('X-Powered-By', 'foobar') failed: expected 'Express' to equal 'foobar'"
            );
          }
        );
    });
  });

  describe('body.not', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/body.html')
        .test.body.not(/bla bla/);
    });

    it('negative', function () {
      return browser
        .open('/test/fixtures/test/body.html')
        .test.body.not(/test text/)
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'AssertionError'); }
        );
    });
  });

  describe('sugar', function () {
    it('status', function () {
      return browser
        .open('/test/fixtures/test/status.html')
        .test(200);
    });

    it('header', function () {
      return browser
        .open('/test/fixtures/test/header.html')
        .test('X-Powered-By', 'Express');
    });

    it('body', function () {
      return browser
        .open('/test/fixtures/test/body.html')
        .test(/test text/);
    });

    it('status.not', function () {
      return browser
        .open('/test/fixtures/test/status.html')
        .test.not(404);
    });

    it('header.not', function () {
      return browser
        .open('/test/fixtures/test/header.html')
        .test.not('X-Powered-By', 'Not Express');
    });

    it('body.not', function () {
      return browser
        .open('/test/fixtures/test/body.html')
        .test.not(/bla bla/);
    });
  });

  describe('value', function () {
    it('positive', function () {
      return browser
        .open('/test/fixtures/test/value.html')
        .test.value('input', 'test value');
    });

    it('negative', function () {
      return browser
        .open('/test/fixtures/test/value.html')
        .test.value('input', 'not test value')
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'AssertionError'); }
        );
    });

    it('.not positive', function () {
      return browser
        .open('/test/fixtures/test/value.html')
        .test.value.not('input', 'not test value');
    });

    it('.not negative', function () {
      return browser
        .open('/test/fixtures/test/value.html')
        .test.value.not('input', 'test value')
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'AssertionError'); }
        );
    });
  });

  after(function (done) {
    server.close();
    browser.exit(done);
  });
});
