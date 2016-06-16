'use strict';


const spawn        = require('child_process').spawn;
const path         = require('path');
const NavitError   = require('../../error');
const debug        = require('debug');
const _            = require('lodash');
const slice        = require('sliced');


const logger = {
  debug: debug('navit:electron:debug'),
  warn:  debug('navit:electron:warn'),
  error: debug('navit:electron:error')
};


function Page(id, engine) {
  this.__id__ = id;
  this.__engine__ = engine;
}

Page.prototype.close = function (callback) {
  this.invoke('win', 'close', callback);
};

Page.prototype.invoke = function (/*command, params, callback*/) {
  this.__engine__.withCallback.apply(
    this.__engine__,
    [ this.__id__ ].concat(slice(arguments))
  );
};


// Shortcut for often user method
Page.prototype.evaluate = function (/*fn , ...params, callback*/) {
  this.invoke.apply(this, [ 'evaluate' ].concat(slice(arguments)));
};


function Engine(electron) {
  this.__electron__     = electron;
  this.__lastCallerId__ = 0;
  this.__callers__      = {};

  this.__electron__.on('message', message => {
    if (message && message.ns === '@@NAVIT_CB') {
      if (this.__callers__[message.callerId]) {
        // Handle callback event
        this.__callers__[message.callerId](message.error, message.data);
      } else {
        logger.error(`callback handler not exists [id: ${message.callerId}]`);
      }
    }

    if (message && message.ns === '@@NAVIT_EVENT') {
      logger.debug(message.data);
    }
  });
}

Engine.prototype.withCallback = function (pageId, method/*, ...args, callback*/) {
  let callerId = this.__lastCallerId__++;

  this.__callers__[callerId] = arguments[arguments.length - 1];

  let message = {
    ns: '@@NAVIT_INVOKE',
    callerId,
    pageId,
    method,
    args: slice(arguments, 2, -1).map(val => (_.isFunction(val) ? val.toString() : val))
  };

  this.__electron__.send(message);
};

Engine.prototype.createPage = function (callback) {
  this.withCallback(null, 'createPage', (err, pageId) => {
    if (err) return callback(err);

    callback(null, new Page(pageId, this));
  });
};

Engine.prototype.exit = function (callback) {
  if (callback) this.__electron__.once('exit', callback);

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

  electron.once('error', err => callback(err));

  electron.stderr.on('data', data => {
    if (options.ignoreErrorPattern && options.ignoreErrorPattern.exec(data)) {
      return;
    }
    logger.error(String(data));
  });

  electron.stdout.on('data', data => logger.debug(String(data)));

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
