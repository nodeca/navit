'use strict';


const electron          = require('electron');
const EventEmitter      = require('events');

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
  function onHeadersReceived(details, callback) {
    if (details.resourceType !== 'mainFrame') {
      callback({});
      return;
    }

    let headerArray = [];
    let contentType = null;

    Object.keys(details.responseHeaders).forEach(name => {
      details.responseHeaders[name].forEach((value, idx) => {
        if (name.toLowerCase() === 'content-type' && !idx) {
          contentType = value;
        }

        headerArray.push({ name, value });
      });
    });

    response = {
      url: details.url,
      method: details.method,
      status: details.statusCode,
      contentType,
      headers: headerArray
    };

    notify([ 'header event', Object.assign({}, details, { frame: null, webContents: null }) ]);
    callback({});
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
    win.webContents.session.webRequest.onHeadersReceived(null);
    win.webContents.removeListener('did-finish-load', onFinish);
    win.webContents.removeListener('did-fail-load', onFail);
  }

  let headers = options.headers;
  let extraHeaders = '';
  let postData = null;

  Object.keys(headers).forEach(name => {
    extraHeaders += `${name}:${headers[name]}\n`;
  });

  if (options.method.toUpperCase() === 'POST') {
    postData = [ {
      type: 'rawData',
      bytes: Buffer.from(options.data)
    } ];
  }

  function load() {
    if (win.webContents.isLoading()) {
      notify([ 'stopping stale requests' ]);
      win.webContents.once('did-stop-loading', () => load());
      win.webContents.stop();
      return;
    }
    notify([ 'start loading', url ]);

    win.webContents.session.webRequest.onHeadersReceived(onHeadersReceived);
    win.webContents.on('did-finish-load', onFinish);
    win.webContents.on('did-fail-load', onFail);

    if (postData) {
      win.webContents.loadURL(url, { extraHeaders, postData });
    } else {
      win.webContents.loadURL(url, { extraHeaders });
    }
  }

  load();
});


runner.on('win', function (event, name, ...args) {
  let win = event.win;

  let path   = name.split('.');
  let parent = win;
  let method = path[path.length - 1];

  for (let i = 0; i < path.length - 1; i++) {
    parent = parent[path[i]];
  }

  try {
    event.send(null, parent[method].apply(parent, args));
    if (name === 'close') delete pages[event.pageId];
  } catch (e) {
    event.send(e);
    return;
  }
});


runner.on('winAsync', async function (event, name, ...args) {
  let win = event.win;

  let path   = name.split('.');
  let parent = win;
  let method = path[path.length - 1];

  for (let i = 0; i < path.length - 1; i++) {
    parent = parent[path[i]];
  }

  try {
    let result = await parent[method].apply(parent, args);

    event.send(null, [ null, result ]);

    if (name === 'close') delete pages[event.pageId];
  } catch (err) {
    event.send(null, [ err ]);
  }
});


runner.on('evaluate', async function (event, fnStr, ...args) {
  let win = event.win;
  let stringifiedArgs = args.map(arg => JSON.stringify(arg)).join(', ');

  if (win.webContents.isWaitingForResponse()) {
    win.webContents.once('did-stop-loading', async () => {
      let result = await win.webContents.executeJavaScript(`(${fnStr})(${stringifiedArgs});`);
      event.send(null, result);
    });
  } else {
    let result = await win.webContents.executeJavaScript(`(${fnStr})(${stringifiedArgs});`);
    event.send(null, result);
  }
});

// eslint-disable-next-line no-unused-vars
runner.on('execFn', function (event, fnStr, ...args) {
  try {
    /* eslint-disable no-eval */
    eval(`(${fnStr}).apply(event.win, args);`);
  } catch (e) {
    event.send(e);
    return;
  }

  event.send();
});


runner.on('execFnAsync', function (event, fnStr, ...args) {

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


process.on('disconnect', () => {
  app.exit(0);
});


app.on('ready', function () {
  process.send({ event: 'ready' });
});

app.on('window-all-closed', () => {}); // Block quit on all browsers close

ipcMain.on('browser', function (__dummy, ...args) {
  notify({ from: 'browser', data: args });
});
