'use strict';


var assert  = require('chai').assert;
var express = require('express');
var path    = require('path');
var navit   = require('../');


describe('Navit.tab.*', function () {
  var server;
  var browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345', engine: process.env.ENGINE });

    server = express()
        .use(express.static(path.join(__dirname, '..')))
        .listen(17345, function (err) {

      if (err) {
        done(err);
        return;
      }

      // Init phantom before execute first test
      browser.run(done);
    });
  });

  it('open', function (done) {
    browser
      .tab.open()
      .tab.open('/test/fixtures/tab/open.html')
      .test.url('http://localhost:17345/test/fixtures/tab/open.html')
      .run(true, done);
  });

  it('count', function (done) {
    var stack = [];

    browser
      .open('/test/fixtures/tab/count.html')
      .tab.count(stack)
      .tab.open('/test/fixtures/tab/count.html')
      .tab.open()
      .tab.open()
      .tab.count(stack)
      .run(true, function (err) {
        if (err) {
          done(err);
          return;
        }

        assert.strictEqual(stack[0] + 3, stack[1]);
        done();
      });
  });

  it('switch', function (done) {
    browser
      .open('/test/fixtures/tab/open.html')
      .tab.open('/test/fixtures/tab/switch.html')
      .test.url('http://localhost:17345/test/fixtures/tab/switch.html')
      .tab.switch(-2)
      .test.url('http://localhost:17345/test/fixtures/tab/open.html')
      .run(true, done);
  });

  it('close', function (done) {
    browser
      .tab.switch(-1)
      .open('/test/fixtures/tab/open.html')
      .tab.open('/test/fixtures/tab/close.html')
      .test.url('http://localhost:17345/test/fixtures/tab/close.html')
      .tab.close()
      .test.url('http://localhost:17345/test/fixtures/tab/open.html')
      .run(true, done);
  });

  after(function (done) {
    server.close();
    browser.close(done);
  });
});
