'use strict';


const express = require('express');
const path    = require('path');
const navit   = require('../');


describe('Navit.frame.*', () => {
  let server;
  let browser;

  before(function (done) {
    browser = navit({ prefix: 'http://localhost:17345', engine: process.env.ENGINE });

    server = express()
      .use(express.static(path.join(__dirname, '..')))
      .listen(17345, err => {
        if (err) return done(err);
        // Init phantom before execute first test
        browser.then(done);
      });
  });

  it('enter', async function () {
    if ((process.env.ENGINE || 'electron') === 'electron') return this.skip();

    await browser
      .open('/test/fixtures/frame/enter.html')
      .test.text('p', 'It is enter.html')
      .frame.enter('#test-frame')
      .test.text('p', 'It is iframe.html')
      // SlimerJS stay in frame. Reset context for next test.
      .close();
  });

  it('exit', async function () {
    if ((process.env.ENGINE || 'electron') === 'electron') return this.skip();

    await browser
      .open('/test/fixtures/frame/exit.html')
      .frame.enter('iframe')
      .test.text('p', 'It is iframe.html')
      .frame.exit()
      .test.text('p', 'It is exit.html')
      .close();
  });

  after(async () => {
    server.close();
    await browser.exit();
  });
});
