'use strict';


var assert  = require('chai').assert;
var express = require('express');
var path    = require('path');
var fs      = require('fs');
var navit   = require('../');


describe('Navit.get.*', function () {
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
      browser.get.cookies(function () {}).run(done);
    });
  });


  it('title with function', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .get.title(function (title) {
        assert.equal(title, 'test title');
      })
      .run(function (err) {
        done(err);
      });
  });

  it('title with array', function (done) {
    var results = [];

    browser
        .open('http://localhost:17345/test/fixtures/fixtures_test.html')
        .get.title(results)
        .run(function (err) {

      if (err) {
        done(err);
        return;
      }

      assert.equal(results[results.length - 1], 'test title');
      done();
    });
  });

  it('url with function', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .get.url(function (url) {
        assert.equal(url, 'http://localhost:17345/test/fixtures/fixtures_test.html');
      })
      .run(function (err) {
        done(err);
      });
  });

  it('url with array', function (done) {
    var results = [];

    browser
        .open('http://localhost:17345/test/fixtures/fixtures_test.html')
        .get.url(results)
        .run(function (err) {

      if (err) {
        done(err);
        return;
      }

      assert.equal(results[results.length - 1], 'http://localhost:17345/test/fixtures/fixtures_test.html');
      done();
    });
  });

  it('count with function', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .get.count('ul:first-child li', function (count) {
        assert.equal(count, 7);
      })
      .run(function (err) {
        done(err);
      });
  });

  it('count with array', function (done) {
    var results = [];

    browser
        .open('http://localhost:17345/test/fixtures/fixtures_test.html')
        .get.count('ul:first-child li', results)
        .run(function (err) {

      if (err) {
        done(err);
        return;
      }

      assert.equal(results[results.length - 1], 7);
      done();
    });
  });

  it('text with function', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .get.text('#test-div', function (val) {
        assert.equal(val, 'Here is HTML!');
      })
      .run(function (err) {
        done(err);
      });
  });

  it('text with array', function (done) {
    var results = [];

    browser
        .open('http://localhost:17345/test/fixtures/fixtures_test.html')
        .get.text('#test-div', results)
        .run(function (err) {

      if (err) {
        done(err);
        return;
      }

      assert.equal(results[results.length - 1], 'Here is HTML!');
      done();
    });
  });

  it('html with function', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .get.html('#test-div', function (val) {
        assert.equal(val, 'Here is <b>HTML</b>!');
      })
      .run(function (err) {
        done(err);
      });
  });

  it('html with array', function (done) {
    var results = [];

    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .get.html('#test-div', results)
      .run(function (err) {

        if (err) {
          done(err);
          return;
        }

        assert.equal(results[results.length - 1], 'Here is <b>HTML</b>!');
        done();
      });
  });

  it('html for whole page', function (done) {
    var fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'fixtures_test.html'), 'utf-8')
      .split(/[\n ]/)
      .join('');

    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .get.html(function (html) {
        assert.equal(html.split(/[\n ]/).join(''), fixture);
      })
      .run(done);
  });

  it('attribute with function', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .get.attribute('#test-div', 'data-test-attr', function (val) {
        assert.equal(val, 'test attr');
      })
      .run(function (err) {
        done(err);
      });
  });

  it('attribute with array', function (done) {
    var results = [];

    browser
        .open('http://localhost:17345/test/fixtures/fixtures_test.html')
        .get.attribute('#test-div', 'data-test-attr', results)
        .run(function (err) {

      if (err) {
        done(err);
        return;
      }

      assert.equal(results[results.length - 1], 'test attr');
      done();
    });
  });

  it('cookies with function', function (done) {
    browser
      .open('http://localhost:17345/test/fixtures/fixtures_test.html')
      .set.cookies('a', 'b')
      .get.cookies(function (val) {
        assert.deepEqual(val, [ {
          domain: 'localhost',
          httponly: false,
          name: 'a',
          path: '/test/fixtures/',
          secure: false,
          value: 'b'
        } ]);
      })
      .run(function (err) {
        done(err);
      });
  });

  after(function () {
    server.close();
    browser.close();
  });
});
