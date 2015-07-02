2.0.0 / WIP
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
