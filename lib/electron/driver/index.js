'use strict';


const spawn        = require('child_process').spawn;
const path         = require('path');
const NavitError   = require('../../error');
const debug        = require('debug');
const _            = require('lodash');


const logger = {
  debug: debug('navit:electron:debug'),
  warn:  debug('navit:electron:warn'),
  error: debug('navit:electron:error')
};


function Page(id, engine) {
  this.__id__ = id;
  this.__engine__ = engine;
}

Page.prototype.close = async function () {
  await this.invoke('win', 'close');
};

Page.prototype.invoke = function (...args/*command, params*/) {
  return this.__engine__.withCallback.apply(
    this.__engine__,
    [ this.__id__ ].concat(args)
  );
};


// Shortcut for often used method
Page.prototype.evaluate = function (...args/*fn , ...params*/) {
  return this.invoke.apply(this, [ 'evaluate' ].concat(args));
};


function Engine(electron) {
  this.__electron__     = electron;
  this.__lastCallerId__ = 0;
  this.__callers__      = {};

  this.__electron__.on('message', message => {
    if (message && message.ns === '@@NAVIT_CB') {
      if (this.__callers__[message.callerId]) {
        // Handle callback event
        if (message.error) {
          this.__callers__[message.callerId].reject(message.error);
        } else {
          this.__callers__[message.callerId].resolve(message.data);
        }
        this.__callers__[message.callerId] = null;
      } else {
        logger.error(`callback handler not exists [id: ${message.callerId}]`);
      }
    }

    if (message && message.ns === '@@NAVIT_EVENT') {
      logger.debug(message.data);
    }
  });
}

Engine.prototype.withCallback = function (pageId, method, ...args) {
  let callerId = this.__lastCallerId__++;

  let result = new Promise((resolve, reject) => {
    this.__callers__[callerId] = { resolve, reject };
  });

  let message = {
    ns: '@@NAVIT_INVOKE',
    callerId,
    pageId,
    method,
    args: args.map(val => (_.isFunction(val) ? val.toString() : val))
  };

  this.__electron__.send(message);

  return result;
};

Engine.prototype.createPage = async function () {
  let pageId = await this.withCallback(null, 'createPage');

  return new Page(pageId, this);
};

Engine.prototype.exit = function () {
  let resolve;
  let result = new Promise(_resolve => { resolve = _resolve; });

  let electron = this.__electron__;

  electron.removeAllListeners();
  electron.once('exit', resolve);

  process.kill(electron.pid, 'SIGTERM');

  // if bridge doesn't answer in 10 seconds, shut it down
  setTimeout(() => {
    electron.kill('SIGKILL');
  }, 10000).unref();

  return result;
};


exports.create = async function (options) {
  let resolve, reject;
  let result = new Promise((_resolve, _reject) => { resolve = _resolve; reject = _reject; });

  let electron = spawn(
    options.path || 'electron',
    [ path.join(__dirname, 'bridge.js') ],
    { stdio: [ null, null, null, 'ipc' ] }
  );

  electron.stderr.on('data', data => {
    if (options.ignoreErrorPattern && options.ignoreErrorPattern.exec(data)) {
      return;
    }
    logger.error(String(data));
  });

  electron.stdout.on('data', data => logger.debug(String(data)));

  /* eslint-disable no-use-before-define */
  function immediateExit(exitCode) {
    electron.removeListener('exit', immediateExit);
    electron.removeListener('error', immediateError);

    reject(new NavitError(`Electron immediately exited with: ${exitCode}`));
  }

  function immediateError(err) {
    electron.removeListener('exit', immediateExit);
    electron.removeListener('error', immediateError);

    reject(err);
  }

  electron.once('exit', immediateExit);
  electron.once('error', immediateError);

  electron.once('message', message => {
    electron.removeListener('exit', immediateExit);
    electron.removeListener('error', immediateError);

    if (!message || message.event !== 'ready') {
      electron.kill();
      reject(new NavitError(`Unexpected output from electron: ${message}`));
      return;
    }

    resolve(new Engine(electron));
  });

  return result;
};
