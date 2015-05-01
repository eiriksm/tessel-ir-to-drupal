'use strict';
var request = require('request');

module.exports = function(config, callback) {
  var infrared = config.infrared;
  var tessel = config.tessel;
  var offbutton = config.offButton;
  if (!config.url) {
    throw new Error('Please specify a URL in your config.json file.');
  }
  var opts = {
    uri: config.url
  };
  opts.method = 'GET';
  opts.port = 80;
  opts.headers = {
    // Ain't this the best form of API.
    'Cookie': config.session
  };
  opts.json = true;

  // Event listener for when the IR is ready.
  infrared.on('ready', function() {
    // Tell the implementer that stuff is ready.
    callback();
  });

  // Error listener.
  infrared.on('error', function(err) {
    callback(err);
  });

  // All code comparing IR signals are based on the work of @Grassboy:
  // https://github.com/Grassboy/TesselProjects

  // If you are interested in the math behind it, also read this forum post:
  // https://forums.tessel.io/t/does-the-ir-modules-has-decode-function/1070
  var checkSample = (function() {
    return function(input) {
      var diff = 5;
      var result = [], t;
      for (var i = 0; i < input.length; i += 2){
        t = (input[i] * 0x100 + input[i + 1]) ^ 65535;
        result[result.length] = (t > 32767 ? (-((t ^ 65535) + 1)) : t) / 50;
      }
      if (result.length !== offbutton.length) {
        return;
      }
      var isOffButton = false;
      for (var j = 0, n = result.length; j < n; j++){
        if (Math.abs(result[j] - offbutton[j]) > diff) {
          isOffButton = false;
          break;
        }
        isOffButton = true;
      }
      if (isOffButton) {
        console.log('Off button press detected');
        // Blink a short blink, for some visual feedback.
        tessel.led[1].write(true);
        // Turn off led after 500ms
        setTimeout(function() {
          tessel.led[1].write(false);
        }, 500);
        // Send request to server specified in config.
        request(opts, function(e, res, body) {
          if (e) {
            console.log('There was an error doing the request.');
            console.log(e);
            return;
          }
          console.log('Got response code', res.statusCode);
          if (res.statusCode !== 200) {
            // There must have been some sort of problem.
            console.log('The site was not turned off successfully. Make sure you have the correct URL and session cookie set');
            return;
          }
          console.log('Maintenance mode toggled sucessfully. Current state: Maintenance mode is ', (body.state ? 'ON' : 'OFF'));
        });
      }
      else {
        console.log('Received IR signal, but not the off button');
      }
    };
  })();

  // Event listener for data on IR.
  infrared.on('data', function(data) {
    for (var i = 0, n = data.length; i < n; ++i) {
      data[i] = data[i] ^ 0xFF;
    }
    checkSample(data);
  });
};
