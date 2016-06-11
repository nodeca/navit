'use strict';


const electron = require('electron');


let pages = {};
let lastPageId = 0;


function createPage() {
  let pageId = lastPageId++;

  pages[pageId] = new electron.BrowserWindow({ show: false });
  return pageId;
}


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

  let page, result;

  switch (message.event) {
    case 'createPage':
      let pageId = createPage();

      process.send({ event: message.event, callerId: message.callerId, data: { pageId } });
      break;

    case 'pageExec':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      let path   = message.data.name.split('.');
      let parent = page;
      let method = path[path.length - 1];

      for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
      }

      result = parent[method].apply(parent, message.data.args);

      process.send({ event: message.event, callerId: message.callerId, data: result });
      break;

    case 'pageEvaluate':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      let stringifiedArgs = message.data.args.map(arg => JSON.stringify(arg)).join(',');

      page.webContents.executeJavaScript(`(${message.data.fn})(${stringifiedArgs});`, result => {
        process.send({ event: message.event, callerId: message.callerId, data: result });
      });
      break;
  }
});


electron.app.on('ready', function () {
  process.send({ event: 'ready' });
});
