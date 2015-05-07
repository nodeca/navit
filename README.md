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

var stack = []; // You can use lazy functions to pass data between stages,
                // but arrays have more compact notation.

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

Also look files in [test folder](https://github.com/nodeca/navit/tree/master/test).
Those are real examples how to use `navit` with `mocha`.


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


### new Navit(options)

Navit-specific options:

- `inject`: Array of scripts (file paths) to inject after every page load
  (`[ require.resolve('jquery/dist/jquery') ]`).
- `timeout`: Page load and `.wait()` timeout, default `5000ms`.
- `prefix`: url prefix for `.open()` and `.post()`, default empty string.

Browser engine options:

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


### Actions: `.do.*()`

Navigation:

- \+ `.do.open(url [, options])`
  - options:
    - `method` - get(default)|post|put|delete|head
    - `data`
    - `headers`
- \+ `.do.post(url, data[, options])` - shortcut to `.open`, for convenience;
  `method` is set to `post`, and `data` is forwarded to `options.data`.
- \+ `.do.back()`
- \+ `.do.forward()`
- \+ `.do.reload()`

DOM:

- \+ `.do.click(selector)` - click on an element matching `selector`
- \+ `.do.type(selector, text)` - type `text` into input or contenteditable
- \+ `.do.clear(selector)` - clear input value (supports contenteditable)
- \+ `.do.check(selector)` - toggles checkbox or radio
- \+ `.do.select(selector, option)` - selects an `option` in dropdown
- \+ `.do.upload(selector, path)` - selects a file in `input[type="file"]`
- \+ `.do.fill(selector, obj [, submit])` - _not implemented yet_
- \+ `.do.scrollTo(top, left)` - executes `window.scrollTo(top, left)`
- \+ `.do.inject([type, ] file)` - appends a script or stylesheets from external `file` to page, `type` can be one of `js` or `css` (default type is `js`).

Waiting:

- \+ `.do.wait()` - wait until page ready; can be useful after `click`, `back`
  and `forward` actions (`open` and `reload` track progress for html pages
  automatically)
- \+ `.do.wait(delay)` - pause for `delay` milliseconds
- \+ `.do.wait(selector [, timeout])` - wait until selector available
- \+ `.do.wait(fn [, params..., timeout])` - evaluate function in cycle, until
  returns `true`.


### Get data/params: `.get.*()`

All functions, passed to `.get.*`, can be sync (with 1 param) or async (with 2
params). If function returns not falsy type of result (usually a `Error`) or
throws exception, chain will be terminated. That can be used to create complex
test conditions.

- \+ `.get.title(fn)`
- \+ `.get.url(fn)`
- \+ `.get.count(selector, fn)`
- \+ `.get.text(selector, fn)`
- \+ `.get.html([selector,] fn)` - when no selector given, returns full page html.
- \+ `.get.attribute(selector, attribute, fn)`
- `.get.status(fn)`
- `.get.body(fn)`
- `.get.headers(fn)` - return server reply headers. Note, testing
   method is not "symmetric" - use `.test.header(name, ...)`.
- `.get.cookies(fn)` (no pair in `.test.*`)

Sugar:

1. If you pass `Array` instead of `Function`, data will be pushed into it.
2. If `fn` returns `Error` object (or anything else not falsy), chain will be
   stopped with that value.
3. If last param (`callback`) exists, chain will be finished as with `.run` method.


### Set data/params: `.set.*()`

- \+ `.set.headers(obj)`
- \+ `.set.useragent(string)`
- \+ `.set.authentication(user, pass)`
- \+ `.set.viewport(width, height)`
- \+ `.set.zoom(scale)`
- \+ `.set.cookie(obj)`
- \+ `.set.cookie(name, value)`


### Assertions: `.test.*()` & `test()`

Tests available for the most of `get.*` methods:

- `.test.method_name(params..., value [, message)`
- If value to compare is `RegExp`, then data is converted to `String`, and tested
  to match provided regexp.
- __Negative condition `.not` can be added to almost any test, before or after
  method name.__

Additional:

- \+ `.test[.not].exists(selector [, message])`
- \+ `.test[.not].visible(selector [, message])`
- \+ `.test.evaluate(fn [params..., message])` - evaluate & die on any
  result but `true`.

Special sugar (but without custom message):

- `.test(status_number [, message])`
- `.test(body_rexexp [, message])`
- `.test(header_name, string_or_regexp [, message])`


### Misc

- `.close()` - tear down browser process
- `.run([teardown,] done)` - terminate sequence of command (execute and do
  callback),
- `.screenshot([ selector|bounding_rect, type,] path)` - do screenshot
- `.use(plugin [, params...])` - apply plugin
- `.fn(function, params)` - local function execute. Function can be sync
  (0 params) and async (1 param).


### Batches

`navit` allows record sequence or commands to run it later with one call as
many times as you wish.

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
})
// run
.batch('init_page')
```


Other scripting projects
------------------------

Here are links to other similar libraries and comments why we did this one.
Note that comments are given according to our requirements. Your ones can be
different. May be you need more to scrape data from real sites instead of
interface testing and so on. Select the best package for you needs:

- [CasperJS](http://casperjs.org/)
  - Runs standalone. You will not be able to control server and
    browser from single script (load fixtures to db, prior to open page).
  - Tests could be more compact, if CasperJS allows curried style.
- [Zombie.js](https://github.com/assaf/zombie)
  - Uses jsdom. Nice idea, but jsdom emulation is a bit limited
    for complex things. We prefer real browser engines like PhantomJS and
    SlimerJS.
- [Nightmare](https://github.com/segmentio/nightmare)
  - That was the nearest to our needs, and we used it before.
  - It has poor errors control if error happpens in the middle of batch.
    For example, if you wait for selector, it's difficult to check do you
    finished with succes or by timeout.
  - Too few built-in assertions.
  - Not actively developped (see tracker - some problems caused by buggy
    bridge to PhantomJS are not fixed for a long time).
- [Horseman](https://github.com/johntitus/node-horseman)
  - Has sync api, that can be convenient for scraping.
  - Sync api limits you with getting multiple data from browser to server -
    getter should be the single, always the last. You can workaround this
    limitation, but that will increase amount of code to write.


Authors
-------

- [Kirill Efimov](https://github.com/Kirill89)
- [Vitaly Puzrin](https://github.com/puzrin)


License
-------

[MIT](https://raw.github.com/nodeca/navit/master/LICENSE)
