'use strict';


const assert  = require('chai').assert;
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const navit   = require('../');
const helpers = require('./helpers');


describe('Navit.do.*', function () {
  let server;
  let browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345', engine: process.env.ENGINE });

    server = express()
      .use(express.static(path.join(__dirname, '..')))
      .get('/test/fixtures/do/open.html', (req, res) => {
        res.send(JSON.stringify(req.headers));
      })
      .post('/test/fixtures/do/post.html', (req, res) => {
        res.send('post-test');
      })
      .listen(17345, err => {
        if (err) return done(err);
        // Init engine before execute first test
        browser.run(done);
      });
  });

  describe('wait', function () {
    it('with function', function (done) {
      browser
        .open('/test/fixtures/do/wait.html')
        .do.wait(function () {
          if (!window.__testTimer__) {
            window.__testTimer__ = setTimeout(function () {
              window.__finish__ = true;
            }, 1);
          }

          return window.__finish__;
        })
        .run(done);
    });

    it('with function and extra params', function (done) {
      browser
        .open('/test/fixtures/do/wait.html')
        .do.wait(function (param1, param2) {
          return param1 === 'abc' && param2 === 'cde';
        }, () => 'abc', 'cde')
        .run(done);
    });

    it('with function fail by timeout', function (done) {
      browser
        .open('/test/fixtures/do/wait.html')
        .do.wait(() => false, 1)
        .run(function (err) {
          assert.equal(err ? err.name : '', 'NavitError');
          done();
        });
    });

    it('with selector', function (done) {
      browser
        .open('/test/fixtures/do/wait.html')
        .do.wait('#test-div')
        .run(done);
    });

    it('with selector fail by timeout', function (done) {
      browser
        .open('/test/fixtures/do/wait.html')
        .do.wait('#unexisting-test-div', 1)
        .run(function (err) {
          assert.equal(err ? err.name : '', 'NavitError');
          done();
        });
    });
  });

  it('inject', function (done) {
    browser
      .open('/test/fixtures/do/inject.html')
      .do.inject(path.join(__dirname, 'fixtures', 'do', 'inject.js'))
      .do.wait('#html-from-js')
      .run(done);
  });

  it('reload', function (done) {
    browser
      .open('/test/fixtures/do/reload.html')
      .do.inject(path.join(__dirname, 'fixtures', 'do', 'reload.js'))
      .do.wait('#html-from-js')
      .do.reload()
      .test.not.exists('#html-from-js')
      .run(done);
  });

  it('back', function (done) {
    browser
      .open('/test/fixtures/do/back.html')
      .open('/test/fixtures/do/forward.html')
      .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/forward.html'))
      .do.back()
      .do.wait()
      .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html'))
      .run(done);
  });

  it('forward', function (done) {
    browser
      .open('/test/fixtures/do/forward.html')
      .open('/test/fixtures/do/back.html')
      .do.back()
      .do.wait()
      .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/forward.html'))
      .do.forward()
      .do.wait()
      .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html'))
      .run(done);
  });

  describe('click', function () {
    it('with selector', function (done) {
      browser
        .open('/test/fixtures/do/click.html')
        .do.click('#click-test')
        .do.wait()
        .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html'))
        .run(done);
    });

    it('with function', function (done) {
      browser
        .open('/test/fixtures/do/click.html')
        .do.click(function () { return '#click-test'; })
        .do.wait()
        .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html'))
        .run(done);
    });

    // This test case cover phantomjs issue: https://github.com/ariya/phantomjs/issues/14109
    it('event.which should be equals to 1', function (done) {
      browser
        .open('/test/fixtures/do/click.html')
        .do.click('#click-test-2')
        .test.evaluate(function () {
          return window.__mouse_btn__ === 1;
        })
        .run(done);
    });
  });

  it('select', function (done) {
    browser
      .open('/test/fixtures/do/select.html')
      .test.evaluate(function () {
        return document.getElementById('select-change-monitor')
          .innerHTML === '';
      })
      .do.select('#select-test', 'opt3')
      .test.evaluate(function () {
        return document.getElementById('select-test').selectedIndex === 2;
      })
      .test.evaluate(function () {
        return document.getElementById('select-change-monitor')
          .innerHTML === 'The value is: opt3';
      })
      .run(done);
  });

  it('check', function (done) {
    browser
      .open('/test/fixtures/do/check.html')
      .test.evaluate(function () {
        return document.getElementById('checkbox-change-monitor')
          .innerHTML === '';
      })
      .do.check('#checkbox-test')
      .test.evaluate(function () {
        return document.getElementById('checkbox-test').checked;
      })
      .test.evaluate(function () {
        return document.getElementById('checkbox-change-monitor')
          .innerHTML === 'checked';
      })
      .do.check('#checkbox-test')
      .test.evaluate(function () {
        return !document.getElementById('checkbox-test').checked;
      })
      .test.evaluate(function () {
        return document.getElementById('checkbox-change-monitor')
          .innerHTML === 'not checked';
      })
      .run(done);
  });

  it('scrollTo', function (done) {
    browser
      .open('/test/fixtures/do/scroll_to.html')
      .do.scrollTo(0, 100)
      .test.evaluate(function () {
        return window.pageYOffset === 100;
      })
      .run(done);
  });

  it('type', function (done) {
    browser
      .open('/test/fixtures/do/type.html')
      .do.type('#type-test', 'test-TEST-test')
      .test.evaluate(function () {
        return document.getElementById('type-test').value === 'test-TEST-test';
      })
      .do.type('#contenteditable-test', 'test-TEST-test')
      .test.evaluate(function () {
        return document.getElementById('contenteditable-test').innerHTML.trim() === 'test-TEST-test';
      })
      .run(done);
  });

  it('clear', function (done) {
    browser
      .open('/test/fixtures/do/clear.html')
      .do.clear('#clear-test')
      .test.evaluate(function () {
        return document.getElementById('clear-test').value === '';
      })
      .do.clear('#contenteditable-test')
      .test.evaluate(function () {
        return document.getElementById('contenteditable-test').innerHTML.trim() === '';
      })
      .run(done);
  });

  it.skip('upload', function (done) {
    // workaround for utf8 in dir names for SlimeerJS
    var file = helpers.toTmp(path.join(__dirname, 'fixtures', 'do', 'upload.txt'));

    browser
      // Seems phantomjs has bug that cause crash on multiple open. Close tab to reset context.
      .tab.close()
      .open('/test/fixtures/do/upload.html')
      .do.upload('#upload-file', file)
      .do.wait(function () {
        if (!window.__reader__) {
          var input = document.getElementById('upload-file');

          window.__reader__ = new window.FileReader();
          window.__reader__.onload = function () {
            window.__readerDone__ = true;
          };
          window.__reader__.readAsText(input.files[0]);
        }

        return window.__readerDone__;
      })
      .test.evaluate(function () {
        return window.__reader__.result.trim() === 'test-TEST-test';
      })
      .run(err => {
        helpers.unlink(file);
        done(err);
      });
  });

  it.skip('screenshot', function (done) {
    var screenshotPath = helpers.tmp();

    browser
      .open('/test/fixtures/do/screenshot.html')
      .do.screenshot(screenshotPath)
      .run(err => {
        if (err) return done(err);

        assert.equal(fs.existsSync(screenshotPath), true);

        helpers.unlink(screenshotPath);
        done();
      });
  });

  it.skip('open with headers override', function (done) {
    browser
      .set.headers({ 'test-header': 'test-value', 'test-header-2': 'test-value' })
      .do.open('/test/fixtures/do/open.html', { headers: { 'test-header': 'test-open-value' } })
      .test.body(/test-open-value/)
      .test.body(/test-value/)
      .run(done);
  });

  it.skip('post', function (done) {
    browser
      .do.post('/test/fixtures/do/post.html')
      .test.body(/post-test/)
      .run(done);
  });

  after(function (done) {
    server.close();
    browser.close(done);
  });
});
