'use strict';


var assert  = require('chai').assert;
var express = require('express');
var path    = require('path');
var _       = require('lodash');
var navit   = require('../');


describe('Navit.set.*', function () {
  var server;
  var browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345', engine: process.env.ENGINE });

    server = express()
        .use(express.static(path.join(__dirname, '..')))
        .get('/test/fixtures/set/headers.html', function (req, res) {
          res.send(JSON.stringify(req.headers));
        })
        .listen(17345, function (err) {

      if (err) {
        done(err);
        return;
      }

      // Init phantom before execute first test
      browser.run(done);
    });
  });

  // TODO: authentication test

  it('useragent', function (done) {
    browser
      .set.useragent('test-ua')
      .open('/test/fixtures/set/useragent.html')
      .test.evaluate(function () {
        return window.navigator.userAgent === 'test-ua';
      })
      .run(function (err) {
        done(err);
      });
  });

  it('zoom', function (done) {
    browser
      .open('/test/fixtures/set/zoom.html')
      .set.zoom(0.5)
      .test.evaluate(function () {
        return window.screen.width / window.innerWidth <= 0.5;
      })
      .set.zoom(1)
      .run(function (err) {
        done(err);
      });
  });

  it('viewport', function (done) {
    browser
      .open('/test/fixtures/set/viewport.html')
      .set.viewport(110, 120)
      .test.evaluate(function () {
        return window.innerWidth === 110 && window.innerHeight === 120;
      })
      .run(function (err) {
        done(err);
      });
  });

  it('cookies', function (done) {
    browser
      .open('/test/fixtures/set/cookies.html')
      .set.cookie({
        name: 'test',
        value: 'cookie',
        path: '/test'
      })
      .get.cookies(function (cookies) {
        var cookie = _.find(cookies, function (cookie) {
          return cookie.name === 'test';
        });

        assert.equal(cookie.value, 'cookie');
      })
      // Remove cookie
      .set.cookie({
        name: 'test',
        path: '/test',
        value: 'cookie',
        expires: Date.now() - 1000
      })
      .get.cookies(function (cookies) {
        assert.equal(cookies.length, 0);
      })
      .run(done);
  });

  it('headers', function (done) {
    browser
      .set.headers({ 'test-header': 'test-value' })
      .open('/test/fixtures/set/headers.html')
      .test.body(/test-value/)
      .run(done);
  });

  after(function () {
    server.close();
    browser.close();
  });
});
