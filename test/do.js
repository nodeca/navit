'use strict';


var assert  = require('chai').assert;
var express = require('express');
var path    = require('path');
var fs      = require('fs');
var navit   = require('../');


describe('Navit.do.*', function () {
  var server;
  var browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345', engine: process.env.ENGINE });

    server = express()
        .use(express.static(path.join(__dirname, '..')))
        .get('/test/fixtures/do/open.html', function (req, res) {
          res.send(JSON.stringify(req.headers));
        })
        .post('/test/fixtures/do/post.html', function (req, res) {
          res.send('post-test');
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
        .run(function (err) {
          done(err);
        });
    });

    it('with function and extra params', function (done) {
      browser
        .open('/test/fixtures/do/wait.html')
        .do.wait(function (param1, param2) {
          return param1 === 'abc' && param2 === 'cde';
        }, function () {
          return 'abc';
        }, 'cde')
        .run(function (err) {
          done(err);
        });
    });

    it('with function fail by timeout', function (done) {
      browser
        .open('/test/fixtures/do/wait.html')
        .do.wait(function () {
          return false;
        }, 1)
        .run(function (err) {
          assert.equal(err ? err.name : '', 'NavitError');
          done();
        });
    });

    it('with selector', function (done) {
      browser
        .open('/test/fixtures/do/wait.html')
        .do.wait('#test-div')
        .run(function (err) {
          done(err);
        });
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
      .run(function (err) {
        done(err);
      });
  });

  it('reload', function (done) {
    browser
      .open('/test/fixtures/do/reload.html')
      .do.inject(path.join(__dirname, 'fixtures', 'do', 'reload.js'))
      .do.wait('#html-from-js')
      .do.reload()
      .test.not.exists('#html-from-js')
      .run(function (err) {
        done(err);
      });
  });

  it('back', function (done) {
    browser
      .open('/test/fixtures/do/back.html')
      .open('/test/fixtures/do/forward.html')
      .get.url(function (url) {
        assert.equal(url, 'http://localhost:17345/test/fixtures/do/forward.html');
      })
      .do.back()
      .do.wait()
      .get.url(function (url) {
        assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html');
      })
      .run(function (err) {
        done(err);
      });
  });

  it('forward', function (done) {
    browser
      .open('/test/fixtures/do/forward.html')
      .open('/test/fixtures/do/back.html')
      .do.back()
      .do.wait()
      .get.url(function (url) {
        assert.equal(url, 'http://localhost:17345/test/fixtures/do/forward.html');
      })
      .do.forward()
      .do.wait()
      .get.url(function (url) {
        assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html');
      })
      .run(function (err) {
        done(err);
      });
  });

  describe('click', function () {
    it('with selector', function (done) {
      browser
        .open('/test/fixtures/do/click.html')
        .do.click('#click-test')
        .do.wait()
        .get.url(function (url) {
          assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html');
        })
        .run(function (err) {
          done(err);
        });
    });

    it('with function', function (done) {
      browser
        .open('/test/fixtures/do/click.html')
        .do.click(function () { return '#click-test'; })
        .do.wait()
        .get.url(function (url) {
          assert.equal(url, 'http://localhost:17345/test/fixtures/do/back.html');
        })
        .run(function (err) {
          done(err);
        });
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
      .run(function (err) {
        done(err);
      });
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
      .run(function (err) {
        done(err);
      });
  });

  it('scrollTo', function (done) {
    browser
      .open('/test/fixtures/do/scroll_to.html')
      .do.scrollTo(0, 100)
      .test.evaluate(function () {
        return window.pageYOffset === 100;
      })
      .run(function (err) {
        done(err);
      });
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
      .run(function (err) {
        done(err);
      });
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
      .run(function (err) {
        done(err);
      });
  });

  it('upload', function (done) {
    var file = path.join(__dirname, 'fixtures', 'do', 'upload.txt');

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
      .run(function (err) {
        done(err);
      });
  });

  it('screenshot', function (done) {
    var screenshotPath = path.join(
      require('os').tmpdir(),
      require('crypto').randomBytes(8).toString('hex')
    );

    browser
      .open('/test/fixtures/do/screenshot.html')
      .do.screenshot(screenshotPath)
      .run(function (err) {
        if (err) {
          done(err);
          return;
        }

        assert.equal(fs.existsSync(screenshotPath), true);

        if (fs.existsSync(screenshotPath)) {
          fs.unlinkSync(screenshotPath);
        }

        done();
      });
  });

  it('open with headers override', function (done) {
    browser
      .set.headers({ 'test-header': 'test-value', 'test-header-2': 'test-value' })
      .do.open('/test/fixtures/do/open.html', { headers: { 'test-header': 'test-open-value' } })
      .test.body(/test-open-value/)
      .test.body(/test-value/)
      .run(done);
  });

  it('post', function (done) {
    browser
      .do.post('/test/fixtures/do/post.html')
      .test.body(/post-test/)
      .run(done);
  });

  after(function () {
    server.close();
    browser.close();
  });
});
