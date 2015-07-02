'use strict';


var assert  = require('chai').assert;
var express = require('express');
var path    = require('path');
var navit   = require('../');


describe('Navit.frame.*', function () {
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

  it('enter', function (done) {
    browser
      .open('/test/fixtures/frame/enter.html')
      .test.text('p', 'It is enter.html')
      .frame.enter('#test-frame')
      .test.text('p', 'It is iframe.html')
      // SlimerJS stay in frame. Reset context for next test.
      .run(true, function (err) {
        done(err);
      });
  });

  it('exit', function (done) {
    browser
      .open('/test/fixtures/frame/exit.html')
      .frame.enter('iframe')
      .test.text('p', 'It is iframe.html')
      .frame.exit()
      .test.text('p', 'It is exit.html')
      .run(true, function (err) {
        done(err);
      });
  });

  after(function (done) {
    server.close();
    browser.close(done);
  });
});
