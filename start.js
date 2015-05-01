'use strict';
var tessel = require('tessel');
var infraredlib = require('ir-attx4');
var infrared = infraredlib.use(tessel.port.B);

var config = require('./config');
config.tessel = tessel;
config.infrared = infrared;

require('.')(config, function(err) {
  if (err) {
    throw err;
  }
  console.log('IR ready to receive');
});
