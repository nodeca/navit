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

  let page, result, path, parent, method;

  switch (message.event) {
    case 'createPage':
      lastPageId++;

      pages[lastPageId] = new BrowserWindow({ show: false });

      process.send({
        event: message.event,
        callerId: message.callerId,
        data: {
          pageId: lastPageId
        }
      });
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

      process.send({
        event: message.event,
        callerId: message.callerId,
        data: result
      });
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
        let result = Array.prototype.slice.call(arguments, 0);

        process.send({
          event: message.event,
          callerId: message.callerId,
          data: result
        });
      });

      result = parent[method].apply(parent, argsWithCb);

      break;

    case 'pageEvaluate':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      let stringifiedArgs = message.data.args.map(arg => JSON.stringify(arg)).join(',');

      page.webContents.executeJavaScript(`(${message.data.fn})(${stringifiedArgs});`, result => {
        process.send({
          event: message.event,
          callerId: message.callerId,
          data: result
        });
      });
      break;

    default:
      process.send({
        event: message.event,
        callerId: message.callerId,
        error: new Error(`Unknown engine command ${message.event}`)
      });
  }
});


app.on('ready', function () {
  process.send({ event: 'ready' });
});
