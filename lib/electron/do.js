'use strict';


const debug      = require('debug')('navit');
const _          = require('lodash');
const NavitError = require('../error');
const unfunc     = require('../utils').unfunc;
const promisify  = require('util').promisify;
const readFile   = promisify(require('fs').readFile);
const exists     = promisify(require('fs').exists);
const writeFile  = promisify(require('fs').writeFile);


let functions = [];


// Open helper
//
async function open(url, options) {
  // TODO:
  //
  // - headers
  // - useragent
  // - POST
  // - response
  // - inject
  //

  // Can be empty on error
  this.__response__ = await this.__page__.invoke('open', url, options);

  // Save response data in tab info
  this.__tabs__[this.__tabIndex__].response = this.__response__;

  await this.__pageWait__();

  // If is not html page - finish here
  /*if ((self.__response__.contentType || '').indexOf('text/html') === -1) {
    return;
  }*/

  for (let scriptPath of this.__options__.inject) {
    let fileContent = await readFile(scriptPath, 'utf-8');

    await this.__page__.invoke('winAsync', 'webContents.executeJavaScript', fileContent);
  }
}


// Open page
//
functions.push([
  [ 'open', 'do.open' ],
  function do_open(url, options) {
    this.__queue__.push(async function do_open_step() {
      let link = this.__options__.prefix + unfunc(url);

      debug(`do.open('${link}')`);

      let opt = _.defaults({}, options, {
        method: 'GET',
        data: {},
        headers: {}
      });

      opt.headers = _.defaults({}, opt.headers, this.__headers__);

      await open.call(this, link, opt);
    });

    if (_.isFunction(this.afterOpen)) this.afterOpen();

    return this;
  }
]);


// Open page with `POST` method
//
functions.push([
  [ 'post', 'do.post' ],
  function do_post(url, data, options) {
    this.__queue__.push(async function do_post_step() {
      let link = this.__options__.prefix + unfunc(url);

      if (!data) data = '';

      if (typeof data !== 'string' && !Buffer.isBuffer(data)) {
        throw new NavitError('Post data must be a string or a buffer');
      }

      debug(`do.post('${link}')`);

      let opt = _.defaults({}, options, {
        method: 'POST',
        data: Buffer.from(data),
        headers: {}
      });

      opt.headers = _.defaults({}, opt.headers, this.__headers__);

      await open.call(this, link, opt);
    });

    if (_.isFunction(this.afterOpen)) this.afterOpen();

    return this;
  }
]);


// Go back
//
functions.push([
  [ 'back', 'do.back' ],
  function do_back() {
    this.__queue__.push(async function do_back_step() {
      debug('do.back()');

      await this.__page__.invoke('win', 'webContents.goBack');
    });

    return this;
  }
]);


// Go forward
//
functions.push([
  [ 'forward', 'do.forward' ],
  function do_forward() {
    this.__queue__.push(async function do_forward_step() {
      debug('do.forward()');

      this.__page__.invoke('win', 'webContents.goForward');
    });

    return this;
  }
]);


// Reload page
//
functions.push([
  [ 'reload', 'do.reload' ],
  function do_reload() {
    this.__queue__.push(async function do_reload_step() {
      debug('do.reload()');

      await this.__page__.invoke('win', 'webContents.reload');

      /*await this.__page__.evaluate(function () {
        document.location.href = document.location.href;
      }),*/

      await this.__pageWait__();

      for (let scriptPath of this.__options__.inject) {
        let fileContent = await readFile(scriptPath, 'utf-8');

        await this.__page__.invoke('winAsync', 'webContents.executeJavaScript', fileContent);
      }
    });

    if (_.isFunction(this.afterOpen)) this.afterOpen();

    return this;
  }
]);


// Inject
//
functions.push([
  [ 'inject', 'do.inject' ],
  function do_inject(type, filePath) {
    if (!filePath) {
      filePath = type;
      type = 'js';
    }

    let types = {
      js: true,
      css: true
    };

    this.__queue__.push(async function do_inject_step() {
      debug(`do.inject('${type || 'js'}', '${filePath}')`);

      if (!types[type]) {
        throw new NavitError(`do.inject: can't inject file of type ${type}`);
      }

      let fileContent = await readFile(filePath, 'utf-8');

      if (type === 'js') {
        await this.__page__.invoke('winAsync', 'webContents.executeJavaScript', fileContent);
        return;
      }

      await this.__page__.invoke('win', 'webContents.insertCSS', fileContent);
    });

    return this;
  }
]);


// Type
//
functions.push([
  [ 'type', 'do.type' ],
  function do_type(selector, text) {
    this.__queue__.push(async function do_type_step() {
      let sel = unfunc(selector);

      debug(`do.type('${sel}', '${unfunc(text)}')`);

      let exists = await this.__page__.evaluate(function (selector) {
        let element = document.querySelector(selector);

        if (!element) return false;

        element.focus();

        if (element.contentEditable === 'true') {
          let sel = window.getSelection();
          let range = document.createRange();
          range.selectNodeContents(element);
          sel.addRange(range);
        }

        return true;
      }, sel);

      if (!exists) {
        throw new NavitError(`do.type('${sel}') failed - selector not found`);
      }

      let keys = unfunc(text).split('');

      for (let ch of keys) {
        await this.__page__.invoke('win', 'webContents.sendInputEvent',
          { type: 'keyDown', keyCode: ch });

        await this.__page__.invoke('win', 'webContents.sendInputEvent',
          { type: 'char', keyCode: ch });

        await this.__page__.invoke('win', 'webContents.sendInputEvent',
          { type: 'keyUp', keyCode: ch });
      }

      // Without timeout we can go forward before renderer received
      // all typed characters
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    return this;
  }
]);


// Upload
//
// Hack from https://github.com/electron/electron/issues/749#issuecomment-213822739
// until better method available
//
functions.push([
  [ 'upload', 'do.upload' ],
  function do_upload(selector, path) {
    this.__queue__.push(async function do_upload_step() {
      let filePath = unfunc(path);

      debug(`do.upload('${filePath}')`);

      if (!await exists(filePath)) {
        throw new NavitError(`do.upload: file '${filePath}' does not exists`);
      }

      await this.__page__.invoke('execFnAsync', function (selector, filePath, cb) {
        let wc = this.webContents;

        try {
          wc.debugger.attach('1.1');
        } catch (err) {
          cb('Debugger attach failed: ' + err);
          return;
        }

        Promise.resolve()
          .then(() => wc.debugger.sendCommand('DOM.getDocument', {}))

          .then(res => wc.debugger.sendCommand('DOM.querySelector', {
            nodeId: res.root.nodeId,
            selector  // CSS selector of input[type=file] element
          }), err => { throw 'failed to get document ' + err; })

          .then(res => wc.debugger.sendCommand('DOM.setFileInputFiles', {
            nodeId: res.nodeId,
            files: [ filePath ]  // Actual list of paths
          }), err => { throw 'failed to locate selector ' + selector + '[' + err + ']'; })

          .then(() => cb(),
            err => { throw 'failed to set input file ' + filePath + '[' + err + ']'; })

          .catch(err => {
            wc.debugger.detach();
            cb(err);
          });

      }, unfunc(selector), filePath);
    });

    return this;
  }
]);


// Take screenshot
//
// - selector (String)
// - boundingRect (Object|Array) - { top, left, width, height }
// - type (String) - PNG, GIF, JPEG or PDF
// - path (String)
//
functions.push([
  [ 'screenshot', 'do.screenshot' ],
  function screenshot(/*selector|boundingRect, type, path*/) {
    let path, selector, boundingRect, type;

    if (arguments.length > 1) {
      if (_.isString(arguments[0]) || _.isFunction(arguments[0])) {
        selector = arguments[0];
      } else {
        boundingRect = arguments[0];
      }

      path = arguments.length === 3 ? arguments[2] : arguments[1];
      type = arguments.length === 3 ? arguments[1] : 'PNG';
    } else {
      path = arguments[0];
      type = 'PNG';
    }

    path          = unfunc(path);
    selector      = unfunc(selector);
    boundingRect  = unfunc(boundingRect);
    type          = unfunc(type);

    let opts = { path, type };


    function capture(opts, cb) {
      function toBin(image) {
        try {
          let bin = (opts.type.toLowerCase() === 'png') ? image.toPNG() : image.toJPEG(100);
          let result = new Array(bin.length);

          for (let i = 0; i < result.length; i++) result[i] = bin[i];

          cb(null, result);
        } catch (err) {
          cb(err);
        }
      }

      let promise = opts.boundingRect ? this.capturePage(opts.boundingRect) : this.capturePage();

      promise.then(toBin, function (err) { cb(err); });
    }

    let saveImage = async opts => {
      // TODO: need to replace delay with more safe method of
      // renderer wait.
      await new Promise(resolve => setTimeout(resolve, 500));

      let result = await this.__page__.invoke('execFnAsync', capture, opts);

      // console.log(result);
      let buf = Buffer.alloc(result.length);
      for (let i = 0; i < result.length; i++) buf[i] = result[i];

      await writeFile(opts.path, buf);
    };

    this.__queue__.push(async function screenshot_step() {
      debug('do.screenshot()');

      if ([ 'png', 'jpg' ].indexOf(type.toLowerCase()) === -1) {
        throw new NavitError('Image type can be JPG or PNG only');
      }

      if (selector) {
        let newRect = await this.__page__.evaluate(function (selector) {
          let element = document.querySelector(selector);

          return element ? element.getBoundingClientRect() : null;
        }, selector);

        if (!newRect) {
          throw new NavitError(`screenshot('${selector}') failed - selector not found`);
        }

        opts.boundingRect = newRect;
        await saveImage(opts);
        return;
      }

      if (boundingRect) {
        let newRect = _.isArray(boundingRect) ? {
          x: boundingRect[0],
          y: boundingRect[1],
          width: boundingRect[2],
          height: boundingRect[3]
        } : boundingRect;

        opts.boundingRect = newRect;
        await saveImage(opts);
        return;
      }

      await saveImage(opts);
    });

    return this;
  }
]);


module.exports = functions;
