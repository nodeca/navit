'use strict';


const assert  = require('assert');
const express = require('express');
const path    = require('path');
const _       = require('lodash');
const navit   = require('../');
const auth    = require('basic-auth');


describe('Navit.set.*', () => {
  let server;
  let browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345', engine: process.env.ENGINE });

    server = express()
      .get('/test/fixtures/set/authentication.html', (req, res, next) => {
        let user = auth(req);

        if (!user || user.name !== 'john' || user.pass !== 'doe') {
          res.statusCode = 401;
          res.setHeader('WWW-Authenticate', 'Basic realm="example"');
          res.end('Access denied');
          return;
        }

        next();
      })
      .use(express.static(path.join(__dirname, '..')))
      .get('/test/fixtures/set/headers.html', (req, res) => {
        res.send(JSON.stringify(req.headers));
      })
      .listen(17345, err => {
        if (err) return done(err);
        // Init phantom before execute first test
        browser.then(done);
      });
  });

  it('authentication', async () => {
    await browser
      .set.authentication('john', 'doe')
      .open('/test/fixtures/set/authentication.html')
      .test.exists('#test-div');
  });

  it('useragent', async () => {
    await browser
      .set.useragent('test-ua')
      .open('/test/fixtures/set/useragent.html')
      .test.evaluate(function () {
        return window.navigator.userAgent === 'test-ua';
      });
  });

  it('zoom', async () => {
    let size;

    await browser
      .open('/test/fixtures/set/zoom.html')
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, data => { size = data; })
      .set.zoom(0.5)
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, data => assert.deepStrictEqual(data, [ size[0] * 2, size[1] * 2 ]))
      .set.zoom(1);
  });

  it('viewport', async () => {
    await browser
      // Check width only, because heght of electron in Travis-CI
      // is 25px less, for unknown reasons (local tests pass ok).
      .open('/test/fixtures/set/viewport.html')
      // .set.zoom(1)
      .set.viewport(641, 481)
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, data => {
        // electron 1.7.x returns 642 instead of 641
        if (Math.abs(data[0] - 641) > 2) {
          throw new Error('Width is ' + data[0] + ' instead of 641');
        }
        //assert.deepEqual(data[0], 641)
      })
      .set.viewport(799, 599)
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, data => {
        // electron 1.7.x returns 800 instead of 799
        if (Math.abs(data[0] - 799) > 2) {
          throw new Error('Width is ' + data[0] + ' instead of 799');
        }
        //assert.deepEqual(data[0], 799)
      });
  });

  describe('cookies', () => {
    it('set/get & remove by name', async () => {
      let count;

      await browser
        .open('/test/fixtures/set/cookies.html')
        .set.cookie({
          name: 'test',
          value: 'cookie'
        })
        .get.cookies(cookies => {
          count = cookies.length;

          let cookie = _.find(cookies, cookie => cookie.name === 'test');
          assert.equal(cookie.value, 'cookie');
        })
        // Remove cookie
        .set.cookie('test')
        .get.cookies(cookies => assert.equal(cookies.length, count - 1));
    });

    it('remove by expire', async () => {
      let count;

      await browser
        .open('/test/fixtures/set/cookies.html')
        .set.cookie({
          name: 'test',
          value: 'cookie'
        })
        .get.cookies(cookies => { count = cookies.length; })
        .set.cookie({
          name: 'test',
          value: 'cookie',
          expires: 1 // Anything < Date.now() (0 fails in slimer)
        })
        .get.cookies(cookies => assert.equal(cookies.length, count - 1));
    });

    it('set before open', async () => {
      let count;

      await browser
        .set.cookie({
          name: 'test',
          domain: 'localhost',
          value: 'cookie'
        })
        .open('/test/fixtures/set/cookies.html')
        .get.cookies(cookies => {
          count = cookies.length;
          let cookie = _.find(cookies, cookie => cookie.name === 'test');
          assert.equal(cookie.value, 'cookie');
        })
        // Remove cookie
        .set.cookie('test')
        .get.cookies(cookies => assert.equal(cookies.length, count - 1));
    });
  });

  it('headers', async () => {
    await browser
      .set.headers({ 'test-header': 'test-value' })
      .open('/test/fixtures/set/headers.html')
      .test.body(/test-value/);
  });

  after(async () => {
    server.close();
    await browser.exit();
  });
});
