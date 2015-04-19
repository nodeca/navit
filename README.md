navit
=====

[![Build Status](https://img.shields.io/travis/nodeca/navit/master.svg?style=flat)](https://travis-ci.org/nodeca/navit)
[![NPM version](https://img.shields.io/npm/v/navit.svg?style=flat)](https://www.npmjs.org/package/navit)

> Wrapper for PhantomJS to simplify browser tests scripting.


Install
-------

Note, you need `phantomjs` in your dependencies.

```bash
npm install navit --save
npm install phantomjs --save
```


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
  .test.exists('.forum-topiclines')
  .run(function(err) {
    console.log(err || 'Succeeded');
  });
```


API
---

1. All methods are chainable.
2. Methods, marked with `+` have direct aliases without namespace.
3. Chain should be finished with terminator `.run([teardown,] callback)` call.
4. All `.test.*` methods have optional last param `callback`, turning them to
   termintors: `.prefix.method_name(arguments... [, callback])`.
5. Almost everywhere `String` & `Number` params can be defined as functions for
   lazy evaluation.

__Known limitations:__

Some methods like `.do.evaluate()` allow to pass params to evaluated functions.
`navit` uses function's `.length` property, to properly detect params count,
because tailing callbacks are optional. That means, such functions must have
explicit parameters list in definition, and you must pass exactly the same
params count as defined. We decided, it's not a big price for nice API.


## new Navit(options)

Navit-specific options:

- `inject`: Array of scripts (file paths) to inject after every page load
  (`[ require.resolve('jquery/dist/jquery') ]`).
- `timeout`: Page load and `.wait()` timeout, default `5000ms`.
- `port`: mounting port for browser engine (PhantomJS) trabsport, default `12301`.

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

- \+ `.do.open(url [, options])`
- \+ `.do.post(url, data, options)` - shortcut to `.open`, for convenience
- \+ `.do.back()`
- \+ `.do.forward()`
- \+ `.do.reload()`

DOM:

- \+ `.do.click(selector)`
- \+ `.do.type(selector, text)`
- \+ `.do.check(selector)`
- \+ `.do.select(selector, option)`
- \+ `.do.upload(selector, path)`
- \+ `.do.fill(selector, obj [, submit])`
- \+ `.do.scrollTo(top, left)`
- \+ `.do.inject([type, ] file)`

Waiting:

- \+ `.do.wait()` - wait until page ready; can be useful after `click`, `back`
  and `forward` actions (`open` and `reload` track progress for html pages
  automatically)
- \+ `.do.wait(delay)` - pause for `delay` milliseconds
- \+ `.do.wait(selector [, timeout])` - wait until selector available
- \+ `.do.wait(fn [, params..., timeout])` - evaluate function in cycle, until
  returns `true`.


## Get data/params: `.get.*()`

All functions, passed to `.get.*`, can be sync (with 1 param) or async (with 2
params). If function returns not `false` type of result (usually a `Error`),
chain will be terminated. That can be used to create complex test conditions.

- \+ `.get.title(fn)`
- \+ `.get.url(fn)`
- \+ `.get.count(selector, fn)`
- \+ `.get.text(selector, fn)`
- \+ `.get.html(selector, fn)`
- \+ `.get.html(fn)` - full page html.
- \+ `.get.attribute(selector, attribute, fn)`
- `.get.status(fn)`
- `.get.body(fn)`
- `.get.headers(fn)` - return server reply headers. Note, testing
   method is not "symmetric" - `.test.header(name, ...)`.
- `.get.cookies(fn)` (no pair in .test.*)

Sugar:

1. If you pass `Array` instead of `Function`, data will be pushed into it.
2. If `fn` returns `Error` object, chain will be stopped with that error.
3. If last param (`callback`) exists, chain will be finished as with `.run` method.


## Set data/params: `.set.*()`

- \+ `.set.headers(obj)`
- \+ `.set.useragent(string)`
- \+ `.set.authentication(user, pass)`
- \+ `.set.viewport(width, height)`
- \+ `.set.zoom(scale)`
- \+ `.set.cookie(obj)`
- \+ `.set.cookie(name, value)`


## Assertions: `.test.*()` & `test()`

Tests available for the most of `get.*` methods:

- `.test.method_name(params..., value [, message, callback)`
- If value to compare is `RegExp`, then data is converted to `String`, and tested
  to match provided regexp.
- Negative condition `.not` can be added to any test, before of after method name.

Additional:

- \+ `.test.exists(selector [, message, callback])`
- \+ `.test.not.exists(selector [, message, callback])`
- \+ `.test.visible(selector [, message, callback])`
- \+ `.test.not.visible(selector [, message, callback])`
- \+ `.test.evaluate(fn [params..., message, callback])` - evaluate & die on any
  result but `true`.

Special sugar (but without custom message):

- `.test(status_number [, callback])`
- `.test(body_rexexp [, callback])`
- `.test(header_name, string_or_regexp [, callback])`


## Misc

- `.close()` - tear down browser process
- `.run([teardown,] done)` - terminate sequence of command (execute and do
  callback),
- `.screenshot([ selector|bounding_rect, type,] path)` - do screenshot
- `.use(plugin [, params...])` - apply plugin
- `.fn(function, params)` - local function execute.


## Batches

```js
// create
.batch.create('init_page', function() {
  this.
    .wait(function () {
      try {
        return window.NodecaLoader.booted;
      } catch (__) {}
      return false;
    });
    .viewport(1600, 1200)
    .inject(require.resolve('jquery/dist/jquery'))
    .fn(function () {
      console.log('Batch done.');
    })
});

// run
.batch('init_page')
```


Authors
-------

- [Kirill Efimov](https://github.com/Kirill89)
- [Vitaly Puzrin](https://github.com/puzrin)


License
-------

[MIT](https://raw.github.com/nodeca/navit/master/LICENSE)
