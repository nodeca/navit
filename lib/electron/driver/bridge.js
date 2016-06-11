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


function pageSet(page, key, value) {
  switch (key) {
    case 'viewportSize':
      page.setSize(value.width, value.height, false);
      break;
  }
}


function pageOpenUrl(page, url, options) {
  page.webContents.loadURL(url, options);
}


function pageGet(page, key) {
  switch (key) {
    case 'isLoading':
      return page.webContents.isLoading();
    case 'url':
      return page.webContents.getURL();
    case 'title':
      return page.webContents.getTitle();
  }
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

    case 'pageSet':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      pageSet(page, message.data.key, message.data.value);
      process.send({ event: message.event, callerId: message.callerId });
      break;

    case 'pageGet':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      result = pageGet(page, message.data.key);

      process.send({ event: message.event, callerId: message.callerId, data: result });
      break;

    case 'pageOpenUrl':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      pageOpenUrl(page, message.data.url, message.data.options);
      process.send({ event: message.event, callerId: message.callerId });
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
    case 'pageClose':
      page = pages[message.data.pageId];

      if (!page) {
        pageIdNotFoundError(message);
        break;
      }

      page.close();
      process.send({ event: message.event, callerId: message.callerId });
      break;
  }
});


electron.app.on('ready', function () {
  process.send({ event: 'ready' });
});
