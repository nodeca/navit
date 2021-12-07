'use strict';


const assert  = require('assert');
const express = require('express');
const path    = require('path');
const navit   = require('../');


describe('Navit.test.*', () => {
  let server;
  let browser;

  before(done => {
    browser = navit({ prefix: 'http://localhost:17345', engine: process.env.ENGINE });

    server = express()
      .use(express.static(path.join(__dirname, '..')))
      .listen(17345, err => {
        if (err) return done(err);
        // Init phantom before execute first test
        browser.run(done);
      });
  });

  describe('text', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/text.html')
        .test.text('ul:first-child li:nth-child(2)', 'two');
    });

    it('negative', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/text.html')
          .test.text('ul:first-child li:nth-child(2)', 'five');
      });
    });

    it('negative RegExp', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/text.html')
          .test.text('ul:first-child li:nth-child(2)', /five/);
      });
    });

    it('.not positive', async () => {
      await browser
        .open('/test/fixtures/test/text.html')
        .test.text.not('ul:first-child li:nth-child(2)', 'five');
    });

    it('.not negative', async () =>  {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/text.html')
          .test.text.not('ul:first-child li:nth-child(2)', 'two');
      });
    });
  });

  describe('count', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/count.html')
        .test.count('ul:first-child li', 7);
    });

    it('negative', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/count.html')
          .test.count('ul:first-child li', 9);
      });
    });

    it('.not positive', async () => {
      await browser
        .open('/test/fixtures/test/count.html')
        .test.count.not('ul:first-child li', 9);
    });

    it('.not negative', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/count.html')
          .test.count.not('ul:first-child li', 7);
      });
    });

    it('.not negative with message', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/count.html')
          .test.count.not('ul:first-child li', 7, 'li count wrong');
      }, /AssertionError: li count wrong: expected 7 to not equal 7/);
    });
  });

  describe('title', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/title.html')
        .test.title('test title');
    });

    it('.not positive', async () => {
      await browser
        .open('/test/fixtures/test/title.html')
        .test.title.not('something else');
    });
  });

  describe('url', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/url.html')
        .test.url('http://localhost:17345/test/fixtures/test/url.html');
    });

    it('.not positive', async () => {
      await browser
        .open('/test/fixtures/test/url.html')
        .test.url.not('something else');
    });
  });

  describe('attribute', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/attribute.html')
        .test.attribute('#test-div', 'data-test-attr', 'test attr');
    });

    it('.not positive', async () => {
      await browser
        .open('/test/fixtures/test/attribute.html')
        .test.attribute.not('#test-div', 'data-test-attr', 'something else');
    });
  });

  describe('exists', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/exists.html')
        .test.exists('#test-div');
    });

    it('.not positive', async () => {
      await browser
        .open('/test/fixtures/test/exists.html')
        .test.not.exists('#no-existing-test-div');
    });
  });

  describe('exists', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/exists.html')
        .test.exists('#test-div');
    });

    it('.not positive', async () => {
      await browser
        .open('/test/fixtures/test/exists.html')
        .test.not.exists('#no-existing-test-div');
    });
  });

  describe('visible', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/visible.html')
        .test.visible('#visible-div');
    });

    it('.not positive', async () => {
      await browser
        .open('/test/fixtures/test/visible.html')
        .test.not.visible('#invisible-div');
    });
  });

  describe('evaluate', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/evaluate.html')
        .test.evaluate(function (a, b, c) {
          return a + b + c === 6;
        }, 1, 2, 3);
    });

    it('negative', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/evaluate.html')
          .test.evaluate(function (a, b, c) {
            return a + b + c === 7;
          }, 1, 2, 3, 'test msg');
      }, /AssertionError: test msg: expected false to equal true/);
    });
  });

  describe('status', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/status.html')
        .test.status(200);
    });

    it('negative', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/status.html')
          .test.status(404);
      }, /expected 200 to equal 404/);
    });
  });

  describe('header', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/header.html')
        .test.header('X-Powered-By', 'Express');
    });

    it('negative', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/header.html')
          .test.header('X-Powered-By', 'foobar');
      }, /expected 'Express' to equal 'foobar'/);
    });
  });

  describe('body.not', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/body.html')
        .test.body.not(/bla bla/);
    });

    it('negative', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/body.html')
          .test.body.not(/test text/);
      });
    });
  });

  describe('sugar', () => {
    it('status', async () => {
      await browser
        .open('/test/fixtures/test/status.html')
        .test(200);
    });

    it('header', async () => {
      await browser
        .open('/test/fixtures/test/header.html')
        .test('X-Powered-By', 'Express');
    });

    it('body', async () => {
      await browser
        .open('/test/fixtures/test/body.html')
        .test(/test text/);
    });

    it('status.not', async () => {
      await browser
        .open('/test/fixtures/test/status.html')
        .test.not(404);
    });

    it('header.not', async () => {
      await browser
        .open('/test/fixtures/test/header.html')
        .test.not('X-Powered-By', 'Not Express');
    });

    it('body.not', async () => {
      await browser
        .open('/test/fixtures/test/body.html')
        .test.not(/bla bla/);
    });
  });

  describe('value', () => {
    it('positive', async () => {
      await browser
        .open('/test/fixtures/test/value.html')
        .test.value('input', 'test value');
    });

    it('negative', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/value.html')
          .test.value('input', 'not test value');
      });
    });

    it('.not positive', async () => {
      await browser
        .open('/test/fixtures/test/value.html')
        .test.value.not('input', 'not test value');
    });

    it('.not negative', async () => {
      await assert.rejects(async () => {
        await browser
          .open('/test/fixtures/test/value.html')
          .test.value.not('input', 'test value');
      });
    });
  });

  after(function (done) {
    server.close();
    browser.exit(done);
  });
});
