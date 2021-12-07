navit
=====

[![CI](https://github.com/nodeca/navit/actions/workflows/ci.yml/badge.svg)](https://github.com/nodeca/navit/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/navit.svg?style=flat)](https://www.npmjs.org/package/navit)

> Wrapper for [Electron](https://www.electronjs.org/) to simplify browser tests scripting.


Install
-------

Note, you need to install `electron` with this package, it is not included as
a dependency.

```bash
npm install navit electron --save
```


Examples
--------

```js
const browser = require('./')({ timeout: 30000, engine: 'electron' });

const stack = []; // You can use lazy functions to pass data between stages,
                  // but arrays have more compact notation.

browser
  .open('https://dev.nodeca.com')
  .wait(() => {
    try { return window.NodecaLoader.booted; } catch (__) { return false; }
  })
  .get.url(stack)
  .click('forum-category__content:first forum-section__title-link')
  .wait(data => location.url !== data[data.length - 1], stack)
  .test.exists('.forum-topiclines')
  .close()
  .then(() => console.log('Succeeded'), err => console.log(err));

// Or with callback (old way)

browser
  .open('https://dev.nodeca.com')
  .wait(() => {
    try { return window.NodecaLoader.booted; } catch (__) { return false; }
  })
  .get.url(stack)
  .click('forum-category__content:first forum-section__title-link')
  .wait(data => location.url !== data[data.length - 1], stack)
  .test.exists('.forum-topiclines')
  // first param `true` is equivalent to `.close()` call
  .run(true, function (err) {
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
4. Almost everywhere `String` & `Number` params can be defined as functions for
   lazy evaluation.

__Known limitations:__

Some methods like `.get.evaluate()` allow to pass params to evaluated functions.
`navit` uses function's `.length` property, to properly detect params count,
because tailing callbacks are optional. That means, such functions must have
explicit parameters list in definition, and you must pass exactly the same
params count as defined. We decided, it's not a big price for nice API.

Electron is NOT headless. To run your script in headless environment,
you should [xvfb](https://github.com/electron/electron/blob/master/docs/tutorial/testing-on-headless-ci.md).


### new Navit(options, engineOpts)

__options__ (not mandatory):

- `inject`: Array of scripts (file paths) to inject after every page load
  (`[ require.resolve('jquery/dist/jquery') ]`).
- `timeout`: Page load and `.wait()` timeout, default `5000ms`.
- `prefix`: url prefix for `.open()` and `.post()`, default empty string.
- `engine`: optional, engine driver to use. Only `electron` is available for now.
- `enginePath`: optional, direct path to browser engine. Don't use without
   need, it should be autodetected via `electron` package.

__engineOpts__ (not mandatory, camelCase):

See https://www.electronjs.org/docs/api/command-line-switches.
You can pass any options, supported by browser engine. Option names should be
in camelCase.


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
- \+ `.do.fill(selector, obj [, submit])` - fill out a form (same as
  [fill](http://docs.casperjs.org/en/latest/modules/casper.html#fill)
  in CasperJS)
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
- \+ `.get.value(selector, fn)` - for input/selector fields, returns field value.
- `.get.evaluate(fnToEval [, params, fn])` - evaluate function on client with optional params.
  Returned result can be processed on server, if handler set.
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
- \+ `.set.cookie(name, value)` *If value not passed, cookie will be deleted.


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

Special sugar:

- `.test(status_number [, message])`
- `.test(body_rexexp [, message])`
- `.test(header_name, string_or_regexp [, message])`


### Tabs: `.tab.*()`

- `.tab.open([url [, options]])` - create and switch to new tab. Run `.do.open(url, options)` if `url` specified
- `.tab.count(fn)` - get tabs count (if you pass `Array`, value will be pushed into)
- `.tab.switch(index)` - switch to tab by `index`
- `.tab.close([index])` - close tab by `index` or close current tab if `index` not specified
  - negative `index` address tab from the tail
  - after all tabs closed, new one will be created automatically


### Other

- `.fn(function, params)` - local function execute. Function can be with callback
  or sync or async or return Promise. Params count should match function signature
  for sync functions (and be 1 less for function with callback).
- `.exit()` - tear down browser process. Note, browser will NOT be closed until
  you do it explicit via this method or `.run(true, ...)`.
- `.close()` - similar to `.exit()` but stackable (will be executed in order
  with other chained commends).
- `.run([teardown,] done)` - terminate sequence of commands (execute and do
  callback).
  - If `teardown` is `true`, then close the browser after the sequence
    finishes.
  - If callback not passed, return result as `Promise`.
- `.then(onSuccess, onFail)` - executes `.run(false)` under the hood.
- `.screenshot([ selector|bounding_rect, type,] path)` - do screenshot
- `.registerMethod(names, fn)` - add new method with given name(s) (`names`
  can be string or array).
- `.use(plugin [, params...])` - apply plugin.


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


### .afterOpen

If you assign function to this property, it will be called after any `.open`
and `.reload` definition to stack additional commands. This is experimental
feature, that can be changed.

Sometime you may wish to do global setup for all opened pages. For example:

- wait full page init, when it has dynamic scripts loader.
- inject testing scripts from remote host (when you don't like to use global
  option).

You can record your sequence to batch and automate it's injection after every
`open` / `reload`. See example how we setup `navit` in `nodeca`:


```js
// Wait for nodeca scripts load and check status
//
navit.batch.create('waitNodecaBooted', function () {
  this
    .wait(function () {
      try {
        return window.NodecaLoader.booted;
      } catch (__) {}
      return false;
    })
    .test.status(200);
});

navit.afterOpen = function () {
  this.batch('waitNodecaBooted');
};
```

__Note__. `.afterOpen` is called on chain definition phase, not on execution
phase. It's ~ equivalent of typing content manually in test body. That's why it
doesn't have callback to wait async operations - it's not needed.


### Debug

If you assign environment variable `DEBUG` to `navit`, you will see debug message
for every action.

Output example for `DEBUG=navit mocha`:

```
...
navit do.open('http://localhost:17345/test/fixtures/do/type.html') +25ms
navit do.type('#type-test') +20ms
navit test.evaluate() +9ms
navit do.type('#contenteditable-test') +2ms
navit test.evaluate() +9ms
  ✓ type (64ms)
...
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
