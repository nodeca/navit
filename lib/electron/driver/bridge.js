'use strict';


const electron          = require('electron');
const EventEmitter      = require('events');
const slice             = require('sliced');

const { app, BrowserWindow, ipcMain } = electron;

const runner      = new EventEmitter();

const pages       = {};
let   lastPageId  = 0;

function notify(msg) {
  process.send({
    ns: '@@NAVIT_EVENT',
    data: msg
  });
}

runner.on('createPage', event => {
  lastPageId++;

  pages[lastPageId] = new BrowserWindow({
    // Hide window (still not headless)
    show: false,
    webPreferences: {
      // We don't need electron extensions in the browser window
      nodeIntegration: false,
      // 1. Init session in advance to allow cookies manipulations
      //    before page open.
      // 2. Share session between windows.
      partition: 'persist:navit',
      preload:   require('path').join(__dirname, 'preload.js')
    }
  });

  event.send(null, lastPageId);
});


runner.on('open', (event, url, options) => {
  let response;
  let win = event.win;

  /* eslint-disable no-inner-declarations, no-use-before-define */
  function onHeaders(ev, status, newUrl, oldUrl, statusCode, method, referrer, headers, resourceType) {
    if (resourceType !== 'mainFrame') return;

    let headerArray = [];

    Object.keys(headers).forEach(name => {
      headers[name].forEach(value => {
        headerArray.push({ name, value });
      });
    });

    response = {
      url: newUrl,
      method,
      status: statusCode,
      contentType: headers['content-type'][0],
      headers: headerArray
    };

    notify([ 'header event', status, newUrl, oldUrl, statusCode, method, referrer, headers, resourceType ]);
  }

  function onRedirect(ev, oldURL, newURL/*, isMainFrame, httpResponseCode, requestMethod, referrer, headers*/) {
    notify([ 'got redirect request', oldURL, newURL ]);
  }

  function onFinish() {
    notify([ 'finished request' ]);
    cleanup();
    event.send(null, response);
  }

  function onFail(ev, errorCode, errorDescription, validatedURL, isMainFrame) {
    if (!isMainFrame) return;

    notify([ 'load failed event', errorCode, errorDescription, validatedURL, isMainFrame ]);

    cleanup();
    event.send({ code: errorCode, description: errorDescription, url: validatedURL });
  }

  function cleanup() {
    win.webContents.removeListener('did-get-response-details', onHeaders);
    win.webContents.removeListener('did-finish-load', onFinish);
    win.webContents.removeListener('did-fail-load', onFail);
    win.webContents.removeListener('did-get-redirect-request', onRedirect);
  }

  let headers = options.headers;
  let extraHeaders = '';

  Object.keys(headers).forEach(name => {
    extraHeaders += `${name}:${headers[name]}\n`;
  });

  function load() {
    if (win.webContents.isLoading()) {
      notify([ 'stopping stale requests' ]);
      win.webContents.once('did-stop-loading', () => load());
      win.webContents.stop();
      return;
    }
    notify([ 'start loading', url ]);

    win.webContents.on('did-get-response-details', onHeaders);
    win.webContents.on('did-finish-load', onFinish);
    win.webContents.on('did-fail-load', onFail);
    win.webContents.on('did-get-redirect-request', onRedirect);

    win.webContents.loadURL(url, { extraHeaders });
  }

  load();
});


runner.on('win', function (event, name/*, ..args*/) {
  let win = event.win;

  let path   = name.split('.');
  let parent = win;
  let method = path[path.length - 1];

  for (let i = 0; i < path.length - 1; i++) {
    parent = parent[path[i]];
  }

  try {
    event.send(null, parent[method].apply(parent, slice(arguments, 2)));
    if (name === 'close') delete pages[event.pageId];
  } catch (e) {
    event.send(e);
    return;
  }
});


runner.on('winAsync', function (event, name/*, ..args*/) {
  let win = event.win;

  let path   = name.split('.');
  let parent = win;
  let method = path[path.length - 1];

  for (let i = 0; i < path.length - 1; i++) {
    parent = parent[path[i]];
  }

  let argsWithCb = slice(arguments, 2);

  argsWithCb.push(function () {
    event.send(null, slice(arguments));
    if (name === 'close') delete pages[event.pageId];
  });

  try {
    parent[method].apply(parent, argsWithCb);
  } catch (e) {
    event.send(e);
    return;
  }
});


runner.on('evaluate', function (event, fnStr/*, ..args*/) {
  let win = event.win;
  let stringifiedArgs = slice(arguments, 2).map(arg => JSON.stringify(arg)).join(', ');

  win.webContents.executeJavaScript(
    `(${fnStr})(${stringifiedArgs});`,
    result => { event.send(null, result); }
  );
});


runner.on('execFn', function (event, fnStr/*, ..args*/) {
  /* eslint-disable no-unused-vars */
  let args = slice(arguments, 2);

  try {
    /* eslint-disable no-eval */
    eval(`(${fnStr}).apply(event.win, args);`);
  } catch (e) {
    event.send(e);
    return;
  }

  event.send();
});


runner.on('execFnAsync', function (event, fnStr/*, ..args*/) {
  let args = slice(arguments, 2);

  args.push(function (err, data) { event.send(err, data); });

  try {
    /* eslint-disable no-eval */
    eval(`(${fnStr}).apply(event.win, args);`);
  } catch (e) {
    event.send(e);
    return;
  }
});


process.on('message', message => {
  if (!message || message.ns !== '@@NAVIT_INVOKE') return;

  let event = {
    pageId: message.pageId,
    win:    pages[message.pageId],
    send:   (error, data) => {
      if (error instanceof Error) {
        error = {
          message: error.message,
          stack:   error.stack
        };
      }
      process.send({
        ns:       '@@NAVIT_CB',
        callerId: message.callerId,
        method:   message.method,
        error,
        data
      });
    }
  };

  // notify(message);

  if (!event.win && message.method !== 'createPage') {
    event.send(new Error(`Electron error: bad page id (${message.pageId}) in ${JSON.stringify(message)}`));
    return;
  }

  runner.emit.apply(runner, [ message.method, event ].concat(message.args));
});


app.on('ready', function () {
  process.send({ event: 'ready' });
});

app.on('window-all-closed', () => {}); // Block quit on all browsers close

ipcMain.on('browser', function () {
  notify({ from: 'browser', data: slice(arguments, 1) });
});
