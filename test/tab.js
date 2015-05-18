'use strict';


var assert  = require('chai').assert;
var express = require('express');
var path    = require('path');
var navit   = require('../');


describe('Navit.tab.*', function () {
  var server;
  var browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345' });

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
      .run(done);
  });

  it('count', function (done) {
    browser
      .open('/test/fixtures/tab/count.html')
      .tab.open('/test/fixtures/tab/count.html')
      .tab.open()
      .tab.open()
      .tab.count(function (count) {
        assert.strictEqual(count, 4);
      })
      .run(done);
  });

  it('switch', function (done) {
    browser
      .open('/test/fixtures/tab/open.html')
      .tab.open('/test/fixtures/tab/switch.html')
      .test.url('http://localhost:17345/test/fixtures/tab/switch.html')
      .tab.switch(0)
      .test.url('http://localhost:17345/test/fixtures/tab/open.html')
      .run(done);
  });

  it('close', function (done) {
    browser
      .open('/test/fixtures/tab/open.html')
      .tab.open('/test/fixtures/tab/close.html')
      .test.url('http://localhost:17345/test/fixtures/tab/close.html')
      .tab.close()
      .test.url('http://localhost:17345/test/fixtures/tab/open.html')
      .run(done);
  });

  after(function () {
    server.close();
    browser.close();
  });
});
