'use strict';


var assert  = require('chai').assert;
var express = require('express');
var path    = require('path');
var _       = require('lodash');
var fs      = require('fs');
var navit   = require('../');


describe('Navit.get.*', function () {
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

  describe('title', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/title.html')
        .get.title(function (title) {
          assert.equal(title, 'test title');
        })
        .run(function (err) {
          done(err);
        });
    });

    it('with async function', function (done) {
      browser
        .open('/test/fixtures/get/title.html')
        .get.title(function (title, next) {
          assert.equal(title, 'test title');
          next('test-err');
        })
        .run(function (err) {
          assert.equal(err ? err : '', 'test-err');
          done();
        });
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/title.html')
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
  });

  describe('url', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/url.html')
        .get.url(function (url) {
          assert.equal(url, 'http://localhost:17345/test/fixtures/get/url.html');
        })
        .run(function (err) {
          done(err);
        });
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/url.html')
        .get.url(results)
        .run(function (err) {

          if (err) {
            done(err);
            return;
          }

          assert.equal(results[results.length - 1], 'http://localhost:17345/test/fixtures/get/url.html');
          done();
        });
    });
  });

  describe('count', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/count.html')
        .get.count('ul:first-child li', function (count) {
          assert.equal(count, 7);
        })
        .run(function (err) {
          done(err);
        });
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/count.html')
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

    it('params as functions', function (done) {
      browser
        .open('/test/fixtures/get/count.html')
        .get.count(function () {
          return 'ul:first-child li';
        }, function (count) {
          assert.equal(count, 7);
        })
        .run(function (err) {
          done(err);
        });
    });
  });

  describe('text', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/text.html')
        .get.text('#test-div', function (val) {
          assert.equal(val, 'Here is HTML!');
        })
        .run(function (err) {
          done(err);
        });
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/text.html')
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

    it('params is functions', function (done) {
      browser
        .open('/test/fixtures/get/text.html')
        .get.text(function () {
          return '#test-div';
        }, function (val) {
          assert.equal(val, 'Here is HTML!');
        })
        .run(function (err) {
          done(err);
        });
    });
  });

  describe('html', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/html.html')
        .get.html('#test-div', function (val) {
          assert.equal(val, 'Here is <b>HTML</b>!');
        })
        .run(function (err) {
          done(err);
        });
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/html.html')
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

    it('params is functions', function (done) {
      browser
        .open('/test/fixtures/get/html.html')
        .get.html(function () {
          return '#test-div';
        }, function (val) {
          assert.equal(val, 'Here is <b>HTML</b>!');
        })
        .run(function (err) {
          done(err);
        });
    });

    it('for whole page', function (done) {
      var fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'get', 'html.html'), 'utf-8')
        .split(/[\n ]/)
        .join('');

      browser
        .open('/test/fixtures/get/html.html')
        .get.html(function (html) {
          assert.equal(html.split(/[\n ]/).join(''), fixture);
        })
        .run(done);
    });
  });

  describe('attribute', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute('#test-div', 'data-test-attr', function (val) {
          assert.equal(val, 'test attr');
        })
        .run(function (err) {
          done(err);
        });
    });

    it('with array', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/attribute.html')
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

    it('params as functions', function (done) {
      var results = [];

      browser
        .open('/test/fixtures/get/attribute.html')
        .get.attribute(function () {
          return '#test-div';
        }, function () {
          return 'data-test-attr';
        }, results)
        .run(function (err) {

          if (err) {
            done(err);
            return;
          }

          assert.equal(results[results.length - 1], 'test attr');
          done();
        });
    });
  });

  it('cookies with function', function (done) {
    browser
      .open('/test/fixtures/get/cookies.html')
      .set.cookie('a', 'b')
      .get.cookies(function (cookies) {
        var cookie = _.find(cookies, function (cookie) {
          return cookie.name === 'a';
        });

        assert.equal(cookie.value, 'b');
      })
      .run(function (err) {
        done(err);
      });
  });

  it('evaluate', function (done) {
    browser
      .open('/test/fixtures/get/evaluate.html')
      .get.evaluate(function (a, b, c) {
        return a + b + c;
      }, 1, 2, 3, function (result) {
        assert.equal(result, 6);
      })
      .run(function (err) {
        done(err);
      });
  });

  it('status', function (done) {
    browser
      .open('/test/fixtures/get/status.html')
      .get.status(function (st) {
        assert.equal(st, 200);
      })
      .run(function (err) {
        done(err);
      });
  });

  it('value', function (done) {
    browser
      .open('/test/fixtures/get/value.html')
      .get.value('input:first-child', function (value) {
        assert.strictEqual(value, 'test value');
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
