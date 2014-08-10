var request = require('request'),
    net = require('net'),
    _ = require('underscore'),

    ERRORCODES = {
        '001': 'Invalid command. Command not found.',
        '002': 'Invalid module address (does not exist).',
        '003': 'Invalid connector address (does not exist).',
        '004': 'Invalid ID value.',
        '005': 'Invalid frequency value.',
        '006': 'Invalid repeat value.',
        '007': 'Invalid offset value.',
        '008': 'Invalid pulse count.',
        '009': 'Invalid pulse data.',
        '010': 'Uneven amount of <on|off> statements.',
        '011': 'No carriage return found.',
        '012': 'Repeat count exceeded.',
        '013': 'IR command sent to input connector.',
        '014': 'Blaster command sent to non-blaster connector.',
        '015': 'No carriage return before buffer full.',
        '016': 'No carriage return.',
        '017': 'Bad command syntax.',
        '018': 'Sensor command sent to non-input connector.',
        '019': 'Repeated IR transmission failure.',
        '020': 'Above designated IR <on|off> pair limit.',
        '021': 'Symbol odd boundary.',
        '022': 'Undefined symbol.',
        '023': 'Unknown option.',
        '024': 'Invalid baud rate setting.',
        '025': 'Invalid flow control setting.',
        '026': 'Invalid parity setting.',
        '027': 'Settings are locked'
    };

var iTach = function(config) {
    var self = this;

    config = _.extend({
        port: 4998,
        timeout: 4000,
        module: 1
    }, config);

    if (!config.host) {
        throw new Error('Host is required for this module to function');
    }

    this.learn = function(done) {
        var options = {
            method: 'GET',
            uri: "http://" + config.host + '/api/v1/irlearn',
            json: true
        };

        return request(options, function (error, response, learnObject) {
            if (error) {
                done && done(JSON.stringify(error));
            } else if (response.statusCode != 200) {
                done && done(JSON.stringify(learnObject));
            } else {
                done && done(false, learnObject);
            }
        });
    };

    this.send = function (input, done) {
        if (!input) throw new Error ('Missing input');
        var data,
            parts = input.ir.split(',');

        if (typeof input.module !== 'undefined') {
            parts[1] = '1:' + input.module;
        }
        // ID:
        parts[2] = 1;

        if (typeof input.repeat !== 'undefined') {
            parts[4] = input.repeat;
        }

        data = parts.join(',');
        console.log('Connecting to ' + config.host + ':' + config.port);

        var socket = net.connect(config.port, config.host);
        socket.setTimeout(config.timeout);


        socket.on('connect', function () {
            console.log('node-itach :: connected to ' + config.host + ':' + config.port);
            console.log('node-itach :: sending data: ' + data);
            socket.write(data + "\r\n");
        });

        socket.on('close', function () {
            console.log('node-itach :: disconnected from ' + config.host + ':' + config.port);
        });

        socket.on('error', function (err) {
            console.error('node-itach :: error :: ', err);
            done(err);
            socket.destroy();
        });

        socket.on('timeout', function() {
            console.error('node-itach :: error :: ', 'Timeout');
            done('Timeout');
            socket.destroy();
        });

        socket.on('data', function (data) {
            data = data.toString().replace(/[\n\r]$/, "");
            console.log("node-itach :: received data: " + data);
            var parts = data.split(' ');

            if (parts[0] === 'busyIR') {
                // This shound not happen if this script is the only device connected to the itach
                // add rate limiter
                done('Add Rate Limiter to the blaster')
                return;
            } else if (parts[0].match(/^ERR/)) {
                var err = ERRORCODES[parts[1].split('IR')[1]];
                console.error('node-itach :: error :: ' + data + ': ' + err);
                done(err);
            } else {
                done(false);
            }
            console.log('node-itach :: destroying socket');
            socket.destroy();
        });
    };
};

module.exports = iTach;