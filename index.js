var util = require('util'),
    request = require('request'),
    net = require('net'),
    _ = require('underscore'),
    EventEmitter = require('events').EventEmitter,

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

const DELAY_BETWEEN_COMMANDS = 100;

function iTach(config) {
    config = _.extend({
        port: 4998,
        timeout: 20000,
        module: 1
    }, config);

    if (!config.host) {
        throw new Error('Host is required for this module to function');
    }
    var self = this;
    var isSending = false;
    var debug = config.debug;
    var sendTimeout = null;

    var callbacks = {},
        messageQueue = [],
        _currentRequestID = 0;
    var _addToCallbacks = function (done, predefinedId, debug) {
            var id;
            if (!predefinedId) {
                debug && console.log('node-itach :: generating new id for IR transmittion');
                debug && console.log('node-itach :: currently callbacks hash contains %d', Object.keys(callbacks).length);
                _currentRequestID++;
                id = _currentRequestID;
            }
            else
                id = predefinedId;
            callbacks[id] = done;
            return id;
        },
        _resolveCallback = function (id, err, debug, send) {
            if (callbacks[id]) {
                debug && console.log('node-itach :: status:%s resolving callback with id %s', err ? 'error' : 'success', id);
                callbacks[id](err || false);
                delete callbacks[id];
                send && clearSendTimeoutAndSendRightNow();
            } else {
                console.error('node-itach :: cannot find callback with id %s in callbacks hash', id);
            }
        };

    this.learn = function (done) {
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

    function clearSendTimeoutAndSendRightNow() {
        if (sendTimeout) {
            clearTimeout(sendTimeout);
            sendTimeout = null;
        }
        send_();
    }

    function send_() {

        if (!messageQueue.length) {
            debug && console.log('Message queue is empty. returning...')
            return;
        }
        isSending = true;
        debug && console.log('Taking next message from the queue.')
        var message = messageQueue.shift(),
            id = message[0],
            data = message[1];

        var socket = net.connect(config.port, config.host);
        socket.setTimeout(config.timeout);
        debug && console.log('Connecting to ' + config.host + ':' + config.port);
        self.emit('connecting');
        socket.on('connect', function () {
            debug && console.log('node-itach :: connected to ' + config.host + ':' + config.port);
            debug && console.log('node-itach :: sending data', data);
            self.emit('connected');
            socket.write(data + "\r\n");
            self.emit('send');
        });

        socket.on('close', function () {
            debug && console.log('node-itach :: disconnected from ' + config.host + ':' + config.port);
            self.emit('disconnected');
        });

        socket.on('error', function (err) {
            console.error('node-itach :: error :: ', err);
            socket.destroy();
            for (var key in callbacks)
                callbacks[key](err);
            //self.emit('error', err);
            sendNextMessage();
        });

        socket.on('timeout', function (err) {
            console.error('node-itach :: error :: ', 'Timeout');
            socket.destroy();
            for (var key in callbacks)
                callbacks[key](err);
            //self.emit('error', err);
            sendNextMessage();
        });

        socket.on('data', function (data) {
            var wholeData = data.toString().replace(/[\n\r]$/, "");
            self.emit(data, wholeData);
            wholeData = wholeData.split(/\r/);
            debug && console.log("node-itach :: received data: " + data);
            for (var key in wholeData) {
                data = wholeData[key].toString().replace(/[\n]*/, "");
                if (!data)
                    continue;
                var parts = data.split(','),
                    status = parts[0],//TODO: why it was parts[1]?
                    id = parts[2];

                if (status === 'busyIR') {
                    // This shoud not happen if this script is the only device connected to the iTach
                    // add rate limiter
                    return _resolveCallback(id, 'Add Rate Limiter to the blaster', debug, true);
                } else if (status.match(/^ERR/)) {
                    var tmpArr = parts[1].split('IR');
                    var errCode = tmpArr.length >= 2 ? tmpArr[1] : tmpArr[0];
                    var err = ERRORCODES[errCode];
                    console.error('node-itach :: error :: ' + data + ': ' + err);
                    return _resolveCallback(parts[2] || parts[1], err, debug, true);
                } else if (parts[0] === 'setstate' || parts[0] === 'sendir') {
                    _resolveCallback(parts[1], null, debug, (parts[0] === 'setstate'));
                } else {
                    _resolveCallback(id, null, debug);
                }
            }
            socket.destroy();

            debug && console.log('Delay before going to another item in a queue...');
            setTimeout(sendNextMessage, DELAY_BETWEEN_COMMANDS);
        });
    };

    function sendNextMessage(){
    	isSending = false;
    	// go to the next message in the queue if any
    	if (messageQueue.length){
    		send_();
    	}
    }

    this.disconnect = this.end = this.destroy = function (callback) {
        if (this.socket)
            this.socket.end();
        messageQueue = [];
        callbacks = {};
    }
    this.send = function (input, done) {
        if (!input) throw new Error('Missing input');

        var data, ir;

        if (typeof(input) === 'string') {
            if (input.indexOf('sendir') !== -1)
                input = {ir: input};
            else if (input.indexOf('setstate') !== -1)
                input = {serial: input};
            else
                throw new Error('Unexpected command[' + input + '], expectind for sendir or setstat (serial cmd)');
        }

        ir = (input.ir != null);
        if (ir)
            parts = input.ir.split(',');
        else
            parts = input.serial.split(',');

        if (parts[0].indexOf('sendir') !== -1 && !ir)
            throw new Error('Trying to send ir command, but it passed as ir command: ' + util.inspect(input));
        else if (parts[0].indexOf('setstate') !== -1 && ir)
            throw new Error('Trying to send serial command, but it passed as serial command: ' + util.inspect(input));

        if (!ir && typeof input.module !== 'undefined') {
            parts[1] = '1:' + input.module;
        }
        var id;
        if (ir) {
            id = _addToCallbacks(done, null, debug);
            parts[2] = id;
        }
        else {
            id = parts[1];
            _addToCallbacks(done, id, debug);
        }

        if (ir && typeof input.repeat !== 'undefined') {
            parts[4] = input.repeat;
        }

        data = parts.join(',');

        // add to queue
        messageQueue.push([id, data]);

        if (!isSending) {
            send_();
        }
    }
    iTach.super_.call(this, config);
}
util.inherits(iTach, EventEmitter);
module.exports = {iTach: iTach};
