'use strict';


const assert  = require('chai').assert;
const express = require('express');
const path    = require('path');
const _       = require('lodash');
const navit   = require('../');
const auth    = require('basic-auth');


describe('Navit.set.*', function () {
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
        browser.run(done);
      });
  });

  it('authentication', function () {
    return browser
      .set.authentication('john', 'doe')
      .open('/test/fixtures/set/authentication.html')
      .test.exists('#test-div');
  });

  it('useragent', function () {
    return browser
      .set.useragent('test-ua')
      .open('/test/fixtures/set/useragent.html')
      .test.evaluate(function () {
        return window.navigator.userAgent === 'test-ua';
      });
  });

  it('zoom', function () {
    if (process.env.ENGINE === 'electron') return this.skip();

    let size;

    return browser
      .open('/test/fixtures/set/zoom.html')
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, data => { size = data; })
      .set.zoom(0.5)
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, data => assert.deepEqual(data, [ size[0] * 2, size[1] * 2 ]))
      .set.zoom(1);
  });

  it('viewport', function () {
    return browser
      // Check width only, because heght of electron in Travis-CI
      // is 25px less, for unknown reasons (local tests pass ok).
      .open('/test/fixtures/set/viewport.html')
      // .set.zoom(1)
      .set.viewport(641, 481)
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, data => assert.deepEqual(data[0], 641))
      .set.viewport(799, 599)
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, data => assert.deepEqual(data[0], 799));
  });

  it('cookies', function () {
    return browser
      .open('/test/fixtures/set/cookies.html')
      .set.cookie({
        name: 'test',
        value: 'cookie',
        path: '/test'
      })
      .get.cookies(cookies => {
        let cookie = _.find(cookies, cookie => cookie.name === 'test');

        assert.equal(cookie.value, 'cookie');
      })
      // Remove cookie
      .set.cookie({
        name: 'test',
        path: '/test',
        value: 'cookie',
        expires: Date.now() - 1000
      })
      .get.cookies(cookies => assert.equal(cookies.length, 0));
  });

  it('headers', function () {
    return browser
      .set.headers({ 'test-header': 'test-value' })
      .open('/test/fixtures/set/headers.html')
      .test.body(/test-value/);
  });

  after(function (done) {
    server.close();
    browser.exit(done);
  });
});
