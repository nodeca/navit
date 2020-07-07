/* eslint-disable strict, no-console */

(function () {

  const { ipcRenderer, webFrame } = require('electron');

  let defLog = {};

  // Listen console
  [ 'log', 'warn', 'error' ].forEach(type => {
    defLog[type] = console[type];
    console[type] = function (...args) {
      ipcRenderer.send('browser', 'console', type, args);
      defLog[type].apply(this, args);
    };
  });

  // Listen errors
  window.addEventListener('error', function (e) {
    ipcRenderer.send('browser', 'error', e.message, e.error.stack);
  });


  window.__navit__ = {};

  // Hack to change zoom, webFrame not available in othere places.
  window.__navit__.zoom = function (scale) {
    webFrame.setZoomFactor(scale);
  };

}());
