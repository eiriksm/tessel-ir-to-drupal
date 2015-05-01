'use strict';
var tir = require('../index');
require('should');
describe('Module functionality', function() {
  it('Should expose a function', function() {
    tir.should.be.instanceOf(Function);
  });
});
