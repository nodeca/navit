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
    it('with function', function () {
      return browser
        .open('/test/fixtures/do/wait.html')
        .do.wait(function () {
          if (!window.__testTimer__) {
            window.__testTimer__ = setTimeout(function () {
              window.__finish__ = true;
            }, 1);
          }

          return window.__finish__;
        });
    });

    it('with function and extra params', function () {
      return browser
        .open('/test/fixtures/do/wait.html')
        .do.wait(function (param1, param2) {
          return param1 === 'abc' && param2 === 'cde';
        }, () => 'abc', 'cde');
    });

    it('with function fail by timeout', function () {
      return browser
        .open('/test/fixtures/do/wait.html')
        .do.wait(() => false, 1)
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'NavitError'); }
        );
    });

    it('with selector', function () {
      return browser
        .open('/test/fixtures/do/wait.html')
        .do.wait('#test-div');
    });

    it('with selector fail by timeout', function () {
      return browser
        .open('/test/fixtures/do/wait.html')
        .do.wait('#unexisting-test-div', 1)
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'NavitError'); }
        );
    });

    it('with selector fail when reloading', function () {
      return browser
        .open('/test/fixtures/do/reload-loop.html')
        .do.wait('#unexisting-test-div', 100)
        .then(
          () => { throw new Error('Error should happen'); },
          err => { assert.equal(err ? err.name : '', 'NavitError'); }
        )
        // close browser, otherwise infinite reload
        // will affect the next test
        .then(() => browser.exit());
    });

    it('with time in ms', function () {
      return browser
        .open('/test/fixtures/do/wait.html')
        .do.wait(10);
    });
  });

  it('inject', function () {
    return browser
      .open('/test/fixtures/do/inject.html')
      .do.inject(path.join(__dirname, 'fixtures', 'do', 'inject.js'))
      .do.wait('#html-from-js');
  });

  it('reload', function () {
    return browser
      .open('/test/fixtures/do/reload.html')
      .do.inject(path.join(__dirname, 'fixtures', 'do', 'reload.js'))
      .do.wait('#html-from-js')
      .do.reload()
      .test.not.exists('#html-from-js');
  });

  it('back', function () {
    return browser
      .open('/test/fixtures/do/back.html')
      .open('/test/fixtures/do/forward.html')
      .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/forward.html'))
      .do.back()
      .do.wait()
      .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html'));
  });

  it('forward', function () {
    return browser
      .open('/test/fixtures/do/forward.html')
      .open('/test/fixtures/do/back.html')
      .do.back()
      .do.wait()
      .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/forward.html'))
      .do.forward()
      .do.wait()
      .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html'));
  });

  describe('click', function () {
    it('with selector', function () {
      return browser
        .open('/test/fixtures/do/click.html')
        .do.click('#click-test')
        .do.wait()
        .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html'));
    });

    it('with function', function () {
      return browser
        .open('/test/fixtures/do/click.html')
        .do.click(function () { return '#click-test'; })
        .do.wait()
        .get.url(url => assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html'));
    });

    // This test case cover phantomjs issue: https://github.com/ariya/phantomjs/issues/14109
    it('event.which should be equals to 1', function () {
      return browser
        .open('/test/fixtures/do/click.html')
        .do.click('#click-test-2')
        .test.evaluate(function () {
          return window.__mouse_btn__ === 1;
        });
    });
  });

  it('select', function () {
    return browser
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
      });
  });

  it('check', function () {
    return browser
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
      });
  });

  describe('fill', function () {
    it('all fields', function () {
      return browser
        .open('/test/fixtures/do/fill.html')
        .do.fill('#fill-test', {
          text:     'foo',
          select:   'opt2',
          radio:    true,
          checkbox: true,
          textarea: 'foo bar'
        })
        .test.value('#field_text', 'foo')
        .test.value('#field_select', 'opt2')
        .get.evaluate(function () {
          return document.getElementById('field_radio').checked;
        }, data => assert.equal(data, true))
        .get.evaluate(function () {
          return document.getElementById('field_checkbox').checked;
        }, data => assert.equal(data, true))
        .test.value('#field_textarea', 'foo bar');
    });

    it('select empty value', function () {
      return browser
        .open('/test/fixtures/do/fill.html')
        .do.fill('#fill-test', {
          select: ''
        })
        .test.value('#field_select', '');
    });

    it('select value by its text', function () {
      return browser
        .open('/test/fixtures/do/fill.html')
        .do.fill('#fill-test', {
          select: 'option2'
        })
        .test.value('#field_select', 'opt2');
    });
  });

  it('scrollTo', function () {
    return browser
      .open('/test/fixtures/do/scroll_to.html')
      .do.scrollTo(0, 100)
      .test.evaluate(function () {
        return window.pageYOffset === 100;
      });
  });

  it('type', function () {
    return browser
      .open('/test/fixtures/do/type.html')
      .do.type('#type-test', 'test-TEST-test')
      .get.evaluate(function () {
        return document.getElementById('type-test').value;
      }, data => assert.equal(data, 'test-TEST-test'))
      .do.type('#contenteditable-test', 'test-TEST-test')
      .get.evaluate(function () {
        return document.getElementById('contenteditable-test').innerHTML.trim();
      }, data => assert.equal(data, 'test-TEST-test'));
  });

  it('clear', function () {
    return browser
      .open('/test/fixtures/do/clear.html')
      .do.clear('#clear-test')
      .test.evaluate(function () {
        return document.getElementById('clear-test').value === '';
      })
      .do.clear('#contenteditable-test')
      .test.evaluate(function () {
        return document.getElementById('contenteditable-test').innerHTML.trim() === '';
      });
  });

  it('upload', function () {
    // workaround for utf8 in dir names for SlimeerJS
    var file = helpers.toTmp(path.join(__dirname, 'fixtures', 'do', 'upload.txt'));

    return browser
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
      .then(
        () => { helpers.unlink(file); },
        err => { helpers.unlink(file); throw err; }
      );
  });

  it('screenshot', function () {
    var screenshotPath = helpers.tmp();

    return browser
      .open('/test/fixtures/do/screenshot.html')
      .do.screenshot(screenshotPath)
      .then(() => {
        assert.equal(fs.existsSync(screenshotPath), true);
        helpers.unlink(screenshotPath);
      });
  });

  it('open with headers override', function () {
    return browser
      .set.headers({ 'test-header': 'test-value', 'test-header-2': 'test-value' })
      .do.open('/test/fixtures/do/open.html', { headers: { 'test-header': 'test-open-value' } })
      .test.body(/test-open-value/)
      .test.body(/test-value/);
  });

  it('post', function () {
    return browser
      .do.post('/test/fixtures/do/post.html')
      .test.body(/post-test/);
  });

  after(function (done) {
    server.close();
    browser.exit(done);
  });
});
