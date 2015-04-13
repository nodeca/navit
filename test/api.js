'use strict';

var assert = require('chai').assert;
var navit  = require('../');


describe('Navit api', function () {

  it('.registerMethod should register function in one namespace', function () {
    var n = navit();

    n.registerMethod('test123', function () {
      return 'val';
    });

    assert.equal(n.test123(), 'val');
  });


  it('.registerMethod should remove function from one namespace', function () {
    var n = navit();

    n.registerMethod('test123', function () {
      return 'val';
    });

    // Remove
    n.registerMethod('test123');

    assert.throws(function () {
      n.test123();
    }, TypeError);
  });


  it('.registerMethod should register function in multi namespace', function () {
    var n = navit();

    n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ], function () {
      return 'val';
    });

    assert.equal(n.my.test.namespace.one.test123(), 'val');
    assert.equal(n.my.test.namespace.two.test123(), 'val');
  });


  it('.registerMethod should remove function from multi namespace', function () {
    var n = navit();

    n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ], function () {
      return 'val';
    });

    // Remove
    n.registerMethod([ 'my.test.namespace.one.test123', 'my.test.namespace.two.test123' ]);

    assert.throws(function () {
      n.my.test.namespace.one.test123();
    }, TypeError);

    assert.throws(function () {
      n.my.test.namespace.two.test123();
    }, TypeError);
  });


  it('.registerMethod registered function should work in correct context', function () {
    var n = navit();

    n.testProperty = 'test value';

    n.registerMethod('test123', function () {
      return this.testProperty;
    });

    assert.equal(n.test123(), 'test value');
  });


  it('.registerMethod should register chain as function', function () {
    var n = navit();

    n.registerMethod('test123', function () {
      return '123';
    });

    n.registerMethod('test123.not', function () {
      return 'not123';
    });

    assert.equal(n.test123(), '123');
    assert.equal(n.test123.not(), 'not123');
  });


  it('.registerMethod should register remove function without', function () {
    var n = navit();

    n.registerMethod('test123', function () {
      return '123';
    });

    n.registerMethod('test123.not', function () {
      return 'not123';
    });

    // Remove
    n.registerMethod('test123');

    assert.throws(function () {
      n.test123();
    }, TypeError);

    assert.equal(n.test123.not(), 'not123');
  });
});
