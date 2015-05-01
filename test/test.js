'use strict';
var tir = require('../index');
var should = require('should');
var http = require('http');

var events = require('events');
function getMockTessel() {
  var lastWritten;
  var mockLed = {
    write: function(d) {
      lastWritten = d;
    }
  };
  var mockTessel = {
    led: [
      mockLed,
      mockLed
    ],
    getLastWritten: function() {
      return lastWritten;
    }
  };
  return mockTessel;
}
function getMockLib() {
  return new events.EventEmitter();
}

describe('Module functionality', function() {

  it('Should expose a function', function() {
    tir.should.be.instanceOf(Function);
  });

  it('Should throw an error when called with bad params', function() {
    tir.should.throw(/supply config/);
    tir.bind(tir, {bogus: true}).should.throw(/URL/);
  });

  it('Should call callback when lib is ready', function(done) {
    var mockLib = getMockLib();
    var config = {
      url: 'bogus',
      infrared: mockLib,
      tessel: getMockTessel()
    };
    tir(config, function(err) {
      done(err);
    });
    mockLib.emit('ready');
  });

  it('Should call callback when lib has error', function(done) {
    var mockLib = getMockLib();
    var config = {
      url: 'bogus',
      infrared: mockLib,
      tessel: getMockTessel()
    };
    tir(config, function(err) {
      err.should.not.equal(undefined);
      done();
    });
    mockLib.emit('error', new Error('Bogus error'));
  });

  it('Should not send data to the URL when the IR signal is not correct', function(done) {
    var mockLib = getMockLib();
    var mockTessel = getMockTessel();
    var server = http.createServer(function(req, res) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({state: 0}));
    }).listen(6666);

    var config = {
      url: 'http://localhost:6666',
      infrared: mockLib,
      tessel: mockTessel,
      offButton: [ 51.4, -0.02 ]
    };
    tir(config, function(err, ird) {
      should(ird.getState()).equal(undefined);
      setTimeout(function() {
        server.close();
        should(mockTessel.getLastWritten()).equal(undefined);
        should(ird.getState()).equal(undefined);
        done();
      }, 100);
    });

    mockLib.emit('ready');
    mockLib.emit('data', new Buffer([1, 10, 10]));
    mockLib.emit('data', new Buffer([1, 10, 10, 88, 99]));
  });

  it('Should not do something with a bad URL, but correct IR signal', function(done) {
    var mockLib = getMockLib();
    var mockTessel = getMockTessel();
    var server = http.createServer(function(req, res) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({state: 0}));
    }).listen(6666);

    var config = {
      url: 'https://localhost:6666',
      infrared: mockLib,
      tessel: mockTessel,
      offButton: [ 51.4, -0.02 ]
    };
    tir(config, function(err, ird) {
      should(ird.getState()).equal(undefined);
      setTimeout(function() {
        server.close();
        should(mockTessel.getLastWritten()).equal(true);
        should(ird.getState()).equal(undefined);
        done();
      }, 100);
    });

    mockLib.emit('ready');
    mockLib.emit('data', new Buffer([10, 10, 10]));
  });

  it('Should not do something with a bad status code, but correct IR signal', function(done) {
    var mockLib = getMockLib();
    var mockTessel = getMockTessel();
    var server = http.createServer(function(req, res) {
      res.writeHead(418, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({state: 0}));
    }).listen(6666);

    var config = {
      url: 'http://localhost:6666',
      infrared: mockLib,
      tessel: mockTessel,
      offButton: [ 51.4, -0.02 ]
    };
    tir(config, function(err, ird) {
      should(ird.getState()).equal(undefined);
      setTimeout(function() {
        server.close();
        should(mockTessel.getLastWritten()).equal(false);
        should(ird.getState()).equal(undefined);
        done();
      // Let this one toggle the led back off, to increase coverage.
      }, 800);
    });

    mockLib.emit('ready');
    mockLib.emit('data', new Buffer([10, 10, 10]));
  });

  it('Should turn it both on and off when the URL and IR signal is correct', function(done) {
    var mockLib = getMockLib();
    var value = 0;
    var mockTessel = getMockTessel();
    var server = http.createServer(function(req, res) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({state: value}));
    }).listen(6666);

    var config = {
      url: 'http://localhost:6666',
      infrared: mockLib,
      tessel: mockTessel,
      offButton: [ 51.4, -0.02 ]
    };
    tir(config, function(err, ird) {
      should(ird.getState()).equal(undefined);
      setTimeout(function() {
        mockTessel.getLastWritten().should.equal(true);
        ird.getState().should.equal(0);
      }, 100);
      setTimeout(function() {
        server.close();
        ird.getState().should.equal(1);
        done();
      }, 300);
    });

    mockLib.emit('ready');
    mockLib.emit('data', new Buffer([10, 10, 10]));
    setTimeout(function() {
      value = 1;
      mockLib.emit('data', new Buffer([10, 10, 10]));
    }, 200);

  });
});
