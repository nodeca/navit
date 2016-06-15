'use strict';


const electron = require('electron');

const { app }           = electron;
const { BrowserWindow } = electron;

const pages = {};

let lastPageId = 0;


function pageIdNotFoundError(message) {
  process.send({
    event: message.event,
    callerId: message.callerId,
    error: new Error(`Electron error: bad page id (${message.data.pageId})`)
  });
}


process.on('message', message => {
  if (!message || !message.event) {
    return;
  }

  function sendData(data) {
    process.send({ event: message.event, callerId: message.callerId, data });
  }

  function sendError(error) {
    process.send({ event: message.event, callerId: message.callerId, error });
  }

  let page, result, path, parent, method;

  switch (message.event) {
    case 'createPage':
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
          partition: 'persist:navit'
        }
      });

      sendData({ pageId: lastPageId });
      break;

    case 'pageOpen':
      let response;

      /* eslint-disable no-inner-declarations, no-use-before-define */
      function onHeaders(event, status, newUrl, oldUrl, statusCode, method, referrer, headers, resourceType) {
        let headerArray = [];

        Object.keys(headers).forEach(name => {
          headers[name].forEach(value => {
            headerArray.push({ name, value });
          });
        });

        if (resourceType === 'mainFrame') {
          response = {
            url: newUrl,
            method,
            status: statusCode,
            contentType: headers['content-type'][0],
            headers: headerArray
          };
        }
      }

      function onFinish() {
        page.webContents.removeListener('did-get-response-details', onHeaders);
        page.webContents.removeListener('did-finish-load', onFinish);
        page.webContents.removeListener('did-fail-load', onFail);

        sendData(response);
      }

      function onFail(event, errorCode, errorDescription, validatedURL/*, isMainFrame*/) {
        page.webContents.removeListener('did-get-response-details', onHeaders);
        page.webContents.removeListener('did-finish-load', onFinish);
        page.webContents.removeListener('did-fail-load', onFail);

        sendError({
          code: errorCode,
          description: errorDescription,
          url: validatedURL
        });
      }

      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      page.webContents.on('did-get-response-details', onHeaders);
      page.webContents.on('did-finish-load', onFinish);
      page.webContents.on('did-fail-load', onFail);

      let headers = message.data.options.headers;
      let extraHeaders = '';

      Object.keys(headers).forEach(name => {
        extraHeaders += `${name}:${headers[name]}\n`;
      });

      page.webContents.loadURL(message.data.url, { extraHeaders });

      break;

    case 'pageExec':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      path   = message.data.name.split('.');
      parent = page;
      method = path[path.length - 1];

      for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
      }

      result = parent[method].apply(parent, message.data.args);

      if (message.data.name === 'close') {
        delete pages[message.data.pageId];
      }

      sendData(result);
      break;

    case 'pageExecAsync':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      path   = message.data.name.split('.');
      parent = page;
      method = path[path.length - 1];

      for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
      }

      let argsWithCb = message.data.args.slice();

      argsWithCb.push(function () {
        let result = Array.prototype.slice.call(arguments);

        sendData(result);
      });

      parent[method].apply(parent, argsWithCb);

      break;

    case 'pageEvaluate':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      let stringifiedArgs = message.data.args.map(arg => JSON.stringify(arg)).join(',');

      page.webContents.executeJavaScript(`(${message.data.fn})(${stringifiedArgs});`, result => {
        sendData(result);
      });
      break;

    case 'execFn':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      try {
        /* eslint-disable no-eval */
        eval(`(${message.data.fn}).apply(page, message.data.args);`);
      } catch (e) {
        sendError(e);
        return;
      }

      sendData('');
      break;

    case 'execFnAsync':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      function execAsyncCallback(err, data) {
        if (err) sendError(err);
        else sendData(data);
      }

      message.data.args.push(execAsyncCallback);

      try {
        /* eslint-disable no-eval */
        eval(`(${message.data.fn}).apply(page, message.data.args);`);
      } catch (e) {
        sendError(e);
        return;
      }
      break;

    default:
      sendError(new Error(`Unknown engine command ${message.event}`));
  }
});


app.on('ready', function () {
  process.send({ event: 'ready' });
});
