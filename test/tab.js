'use strict';


const assert  = require('chai').assert;
const express = require('express');
const path    = require('path');
const navit   = require('../');


describe('Navit.tab.*', function () {
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

  it('open', function () {
    return browser
      .tab.open()
      .tab.open('/test/fixtures/tab/open.html')
      .test.url('http://localhost:17345/test/fixtures/tab/open.html')
      .close();
  });

  it('count', function () {
    var stack = [];

    return browser
      .open('/test/fixtures/tab/count.html')
      .tab.count(stack)
      .tab.open('/test/fixtures/tab/count.html')
      .tab.open()
      .tab.open()
      .tab.count(stack)
      .close()
      .then(() => assert.strictEqual(stack[0] + 3, stack[1]));
  });

  it('switch', function () {
    return browser
      .open('/test/fixtures/tab/open.html')
      .tab.open('/test/fixtures/tab/switch.html')
      .test.url('http://localhost:17345/test/fixtures/tab/switch.html')
      .tab.switch(-2)
      .test.url('http://localhost:17345/test/fixtures/tab/open.html')
      .close();
  });

  it('close', function () {
    return browser
      .tab.switch(-1)
      .open('/test/fixtures/tab/open.html')
      .tab.open('/test/fixtures/tab/close.html')
      .test.url('http://localhost:17345/test/fixtures/tab/close.html')
      .tab.close()
      .test.url('http://localhost:17345/test/fixtures/tab/open.html')
      .close();
  });

  after(function (done) {
    server.close();
    browser.exit(done);
  });
});
