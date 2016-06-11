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

  it.skip('useragent', function (done) {
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

  it.skip('zoom', function (done) {
    var size;

    browser
      .open('/test/fixtures/set/zoom.html')
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, function (data) {
        size = data;
      })
      .set.zoom(0.5)
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, function (data) {
        assert.deepEqual(data, [ size[0] * 2, size[1] * 2 ]);
      })
      .set.zoom(1)
      .run(function (err) {
        done(err);
      });
  });

  it.skip('viewport', function (done) {
    browser
      .open('/test/fixtures/set/viewport.html')
      .set.zoom(1)
      .set.viewport(300, 400)
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, function (data) {
        assert.deepEqual(data, [ 300, 400 ]);
      })
      .set.viewport(110, 128)
      .get.evaluate(function () {
        return [ window.innerWidth, window.innerHeight ];
      }, function (data) {
        assert.deepEqual(data, [ 110, 128 ]);
      })
      .run(function (err) {
        done(err);
      });
  });

  it.skip('cookies', function (done) {
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

  it.skip('headers', function (done) {
    browser
      .set.headers({ 'test-header': 'test-value' })
      .open('/test/fixtures/set/headers.html')
      .test.body(/test-value/)
      .run(done);
  });

  after(function (done) {
    server.close();
    browser.close(done);
  });
});
