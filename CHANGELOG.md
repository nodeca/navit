5.0.1 / 2021-12-08
------------------

- Cleanup dependencies.


5.0.0 / 2021-12-08
------------------

- node.js v14+ required.
- Removed `.run()` method. Use async/await.
- `.exit()`: removed callback support. Use async/await.
- Removed callback support in `.fn()` and lazy-evaluated params. Use async/await.
- Fixed electron v12+ compatibility.


4.0.0 / 2020-07-07
------------------

- __Breaking:__ Removed support for `PhantomJS` and `SlimerJS` (engines are outdated).
- Updated Electron version from v2 to v8+.
- `.do.post()` - implemented for electron.
- Rewrite to modern syntax (async/await, ...args).
- Deps bump.


3.1.0 / 2017-09-22
------------------

- .fn() function now can return Promise (and can be `async`).


3.0.4 / 2017-06-08
------------------

- Maintenance: bump dependencies.


3.0.3 / 2016-12-19
------------------

- Added `option.enginePath`, #39.
- Replace makefile with npm scrips


3.0.2 / 2016-10-16
------------------

- Update Electron package name to `electron`, with fallback to
  legacy `electron-prebuilt`.


3.0.1 / 2016-09-27
------------------

- Fix freeze when trying to evaluate javascript during page load.


3.0.0 / 2016-06-18
------------------

- (!!!) `Electron` support added. Much more stable engine.
- __Breaking:__ `.close()` is now stackable command. Use `.exit()` for immediate
  shutdown instead.
- __Breaking:__ Dropped old nodes support. v4.+ required.
- `Promise` support added:
  - `.run()` returns `Promise` if invoked without callback.
  - Navit instance is thenable (`.run()` call can be skipped with promises).
- `.set.cookie(name)` (without value) will delete cookie.
- `.fill()` method, the same as in CasperJS.
- Increased default timeout to 10s.


2.2.0 / 2016-03-17
------------------

- `.do.click()` - Fixed phantomjs2 compatibility.
- Add `phantomjs-prebuild` search when `phantomjs` engine selected.


2.1.0 / 2016-01-28
------------------

- Added PhantomJS 2.1 support (see below).
- Force page cache reset before request. Without it Phantom 2.1 could get
  304 status (without body) instead of 200.
- Improved compatibility of `do.reload` implementation.


2.0.2 / 2016-01-15
------------------

- Fix: `.get.evaluate()` last param should be optional, #30.


2.0.1 / 2015-07-10
------------------

- Switched `node-phantom-simple` driver to 2.0.0 from mainstream.


2.0.0 / 2015-07-02
------------------

- Added `SlimerJS` support.
- Engine options are completely separated in constructor call. Constructor now
  has 2 parameters.
- `ignoreSslErrors` is not `true` anymore. Change it via engine options (second
  constructor param) if needed.
- Added `.get.value` for input fields.
- Emulate `change` event after input update.
- Keep tab open after `.run`.
- `.tab.close` now accepts negative index (count from the tail), and auto-open
  new tab if all tabs were closed.


1.1.2 / 2015-06-09
------------------

- Added `.frame.*` methods, #8.
- Added debug logging, #7.


1.1.1 / 2015-05-18
------------------

- Added `.tab.*` API methods.


1.1.0 / 2015-05-07
------------------

- Added contenteditable support for `.type()`, thanks to @inca.
- Added `[.do].clear()`, thanks to @inca.
- Removed terminator callbacks from `.test.*` all methods.
- Doc fixes.


1.0.1 / 2015-04-21
------------------

- Added `prefix` option.


1.0.0 / 2015-04-19
------------------

- First release.
