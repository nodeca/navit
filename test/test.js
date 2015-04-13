'use strict';


var assert  = require('chai').assert;
var express = require('express');
var path    = require('path');
var navit   = require('../');


describe('Navit.test.*', function () {
  var server;
  var browser;

  before(function (done) {
    browser = navit();

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

  it('text positive', function (done) {
    browser
        .open('http://localhost:17345/test/fixtures/fixtures_test.html')
        .test.text('ul:first-child li:nth-child(2)', 'two')
        .run(done);
  });

  it('text negative', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .test.text('ul:first-child li:nth-child(2)', 'five')
      .run(function (err) {
        assert.equal(err ? err.name : '', 'AssertionError');
        done();
      });
  });

  it('text.not positive', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .test.text.not('ul:first-child li:nth-child(2)', 'five')
      .run(done);
  });

  it('text.not negative', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .test.text.not('ul:first-child li:nth-child(2)', 'two')
      .run(function (err) {
        assert.equal(err ? err.name : '', 'AssertionError');
        done();
      });
  });

  it('count positive', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .test.count('ul:first-child li', 7)
      .run(done);
  });

  it('count negative', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .test.count('ul:first-child li', 9)
      .run(function (err) {
        assert.equal(err ? err.name : '', 'AssertionError');
        done();
      });
  });

  it('count.not positive', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .test.count.not('ul:first-child li', 9)
      .run(done);
  });

  it('count.not negative', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .test.count.not('ul:first-child li', 7)
      .run(function (err) {
        assert.equal(err ? err.name : '', 'AssertionError');
        done();
      });
  });

  after(function () {
    server.close();
    browser.close();
  });
});
