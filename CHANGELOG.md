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
