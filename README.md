navit
=====

[![Build Status](https://img.shields.io/travis/nodeca/navit/master.svg?style=flat)](https://travis-ci.org/nodeca/navit)
[![NPM version](https://img.shields.io/npm/v/navit.svg?style=flat)](https://www.npmjs.org/package/navit)

> Wrapper for PhantomJS to simplify browser tests scripting.


Examples
--------

```js
var Navit   = require('navit'),
    browser = new Navit(); // Short call: `browser = require('navit')();`

var stack = [];

browser
  .open('http://dev.nodeca.com')
  .wait(function () {
    if (window.NodecaLoader && window.NodecaLoader.booted) { return true; }
  })
  .get.url(stack);
  .click('forum-category__content:first forum-section__title-link')
  .wait(function changed(data) {
    if (location.url !== data[data.length - 1]) { return true; }
  }, stack)
  .test.exists('forum-topiclines')
  .run(function(err) {
    console.log(err || 'Succeeded');
  });
```


API
---

1. All methods are chainable
2. Methods, marked with `+` have direct aliases without namespace
3. Chain should be finished with terminator `.run(callback)` call.
4. All getters and asserts have optional last param `callback`, turning them to
   termintors: `.prefix.method_name(arguments... [, callback])`
5. Almost everywhere String & Number params can be defined as functions for
   lazy evaluation.


## new Navit(options)

Navit-specific options:

- `inject`: Array of scripts (file paths) to inject after every page load
  (`[ require.resolve('jquery/dist/jquery') ]`).
- `timeout`: Page load timeout, default `5000ms`.
- `interval`: Poll interval to check load state, default `50ms`.
- `port`: mounting port for browser (PhantomJS ot SlimerJS) trabsport, default `12301`.

Engines options:

- `loadImages`: loads all inlined images, `true` (default) or `false`.
- `ignoreSslErrors`: ignores SSL errors (expired/self-signed certificate errors),
  `true` (default) or `false`.
- `sslProtocol`: sets the SSL protocol (`sslv3`|`sslv2`|`tlsv1`), default `any`.
- `webSecurity`: enables web security and forbids cross-domain XHR, default `true`.
- `proxy`: sets the proxy server, e.g. `http://proxy.company.com:8080`.
- `proxyType`: specifies the proxy type, `http` (default), `none` (disable completely),
  or `socks5`.
- `proxyAuth`: provides authentication information for the proxy, e.g. `username:password`.
- `cookiesFile`: sets the file name to store the persistent cookies, default not set.

## Actions: `.do.*()`

Navigation:

- + `.do.open(url [, options])`
- + `.do.post(url, data, options)`
- + `.do.back()`
- + `.do.forward()`
- + `.do.reload()`

DOM:

- + `.do.click(selector)`
- + `.do.type(selector, text)`
- + `.do.check(selector)`
- + `.do.select(selector, option)`
- + `.do.upload(selector, path)`
- + `.do.fill(selector, obj [, submit])`
- + `.do.scrollTo(top, left)`
- + `.do.inject([type, ] file)`

Waiting:

- \+ `.do.wait()`
- \+ `.do.wait(delay)`
- \+ `.do.wait(selector [, timeout])`
- \+ `.do.wait(fn [, timeout])`


## Get data/params: `.get.*()`

- + `.get.title(fn [, callback])`
- + `.get.url(fn [, callback])`
- + `.get.count(selector, fn [, callback])`
- + `.get.text(selector, fn [, callback])`
- + `.get.html(selector, fn [, callback])`
- + `.get.html(fn [, callback])` - full page html.
- + `.get.attribute(selector, attribute, fn [, callback])`
- `.get.status(fn [, callback])`
- `.get.body(fn [, callback])`
- `.get.headers(fn [, callback])`, assertion pair is .assert.header(...), for single header
- + `.get.response(fn [, callback])`
- `.get.cookies(fn [, callback])` (no pair in .assert.*)

Sugar:

1. If you pass `Array` instead of `Function`, data will be pushed into it.
2. If `fn` returns `Error` object, chain will be stopped with that error.
3. If last param (`callback`) exists, chain will be finished as with `.run` method.

## Set data/params: `.set.*()`

- + `.set.headers(obj)`
- + `.set.useragent(string)`
- + `.set.authentication(user, pass)`
- + `.set.viewport(width, height)`
- + `.set.zoom(scale)`
- + `.set.cookie(obj)`
- + `.set.cookie(name, value)`

## Assertions: `.test.*()` & `test()`

- + `.test.exists(selector [, message, callback])`
- + `.test.notExists(selector [, message, callback])`
- + `.test.visible(selector [, message, callback])`
- + `.test.notVisible(selector [, message, callback])`
- + `.test.evaluate(fn [params..., message, callback])` - evaluate & die on any
  result but `true`.

Also asserts available for all `get.*` methods:

- `.test.method_name(params..., value [, message, callback)`
- if value to compare is `RegExp`, then data is converted to `String`, and tested
  to match provided regexp.

Special sugar (but without custom message)

- `.test(status_number [, callback])`
- `.test(body_rexexp [, callback])`
- `.test(header_name, string_or_regexp [, callback])`


## Misc

- `.close()` - tear down browser process
- `.run([teardown,] done)` - terminate sequence of command,
- `.screenshot([ selector|bounding_rect, type,] path)` - make screenshot
- `.use(plugin [, params...])` - run plugin or named batch
- `.fn(function, params)` - local function execute


## Batches

```js
// create
.batch('init_page', function() {
  this.
    .timeout(2000)
    .wait(function () {
      try {
        return window.NodecaLoader.booted;
      } catch (__) {}
      return false;
    });
    .viewport(1600, 1200)
    .inject(require.resolve('jquery/dist/jquery'))
    .here(function (this) {
      console.log('Batch done.');
    })
});

// run
.batch('init_page')
```
