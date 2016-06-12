'use strict';


const spawn        = require('child_process').spawn;
const path         = require('path');
const NavitError   = require('../../error');
const debug        = require('debug');


const logger = {
  debug: debug('electron:debug'),
  warn: debug('electron:warn'),
  error: debug('electron:error')
};


function Page(id, engine) {
  this.__id__ = id;
  this.__engine__ = engine;
}

Page.prototype.close = function (callback) {
  this.exec('close', [], callback);
};

Page.prototype.exec = function (name, args, callback) {
  this.__engine__.withCallback('pageExec', { name, args, pageId: this.__id__ }, callback);
};

Page.prototype.execAsync = function (name, args, callback) {
  this.__engine__.withCallback('pageExecAsync', { name, args, pageId: this.__id__ }, callback);
};

Page.prototype.evaluate = function (fn /*, ...params, callback*/) {
  let args = Array.prototype.slice.call(arguments, 1, -1);
  let callback = arguments[arguments.length - 1];

  this.__engine__.withCallback('pageEvaluate', { fn: fn.toString(), args, pageId: this.__id__ }, callback);
};


function Engine(electron) {
  this.__electron__     = electron;
  this.__lastCallerId__ = 0;
  this.__callers__      = {};

  this.__electron__.on('message', message => {
    if (message && this.__callers__[message.callerId]) {
      // Handle callback event
      this.__callers__[message.callerId](message.error, message.data);
    } else {

    }
  });
}

Engine.prototype.withCallback = function (event, data, callback) {
  let callerId = this.__lastCallerId__++;

  this.__callers__[callerId] = callback;
  this.__electron__.send({ event, callerId, data });
};

Engine.prototype.createPage = function (callback) {
  this.withCallback('createPage', null, (err, data) => {
    if (err) {
      callback(err);
      return;
    }

    callback(null, new Page(data.pageId, this));
  });
};

Engine.prototype.exit = function (callback) {
  if (callback) {
    this.__electron__.once('exit', callback);
  }

  this.__electron__.kill();
};


exports.create = function (options, callback) {
  if (!callback) {
    callback = options;
    options = {};
  }

  let electron = spawn(
    options.path || 'electron',
    [ path.join(__dirname, 'bridge.js') ],
    { stdio: [ null, null, null, 'ipc' ] }
  );

  electron.once('error', err => {
    callback(err);
  });

  electron.stderr.on('data', data => {
    if (options.ignoreErrorPattern && options.ignoreErrorPattern.exec(data)) {
      return;
    }
    logger.error(String(data));
  });

  electron.stdout.on('data', data => {
    logger.debug(String(data));
  });

  function immediateExit(exitCode) {
    callback(new NavitError(`Electron immediately exited with: ${exitCode}`));
  }

  electron.once('exit', immediateExit);

  electron.once('message', message => {
    if (!message || message.event !== 'ready') {
      electron.kill();
      callback(new NavitError(`Unexpected output from electron: ${message}`));
      return;
    }

    electron.removeListener('exit', immediateExit);

    callback(null, new Engine(electron));
  });
};
