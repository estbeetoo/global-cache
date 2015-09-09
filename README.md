globalcache global-cache
==========

Global Caché official website:  http://www.globalcache.com.



Library to control Global Caché iTach devices (Global Cache iTach Flex devices are upcoming).



Based on https://github.com/tillbaks/node-itach.

This module was inspired by https://github.com/tillbaks/node-itach, but I rewrote most of his code to solve my home automation problems.

I use it with my iTach Flex WiFi (WF2IR).

Installation
-----

```javascript
npm install globalcache --save
```
 
Usage
-----

```javascript
var COMMANDS = {
    "relay5v_on": "setstate,1:1,1",
    "relay5v_off": "setstate,1:1,0",
    "tv.power": "sendir,1:1,1,37735,1,1,171,171,21,64BB,21,21CCCCBBBCCCCCCBCCCCCCBCBBBBBB,21,3773",
    "receiver.powerOff": "sendir,1:1,1,40453,,1,342,171,22,63,22,20,22,63,22,20,22,20,22,63,22,20,22,63,22,20,22,63,22,20,22,63,22,63,22,20,22,63,22,20,22,63,22,63,22,20,22,63,22,63,22,20,22,20,22,20,22,20,22,20,22,63,22,20,22,20,22,63,22,63,22,63,22,1430,342,171,22,63,22,20,22,63,22,20,22,20,22,63,22,20,22,63,22,20,22,63,22,20,22,63,22,63,22,20,22,63,22,20,22,63,22,63,22,20,22,63,22,63,22,20,22,20,22,20,22,20,22,20,22,63,22,20,22,20,22,63,22,63,22,63,22,4045",
    "receiver.powerOn": "sendir,1:1,1,40453,,1,342,171,22,63,22,20,22,63,22,20,22,20,22,63,22,20,22,63,22,20,22,63,22,20,22,63,22,63,22,20,22,63,22,20,22,20,22,63,22,20,22,63,22,63,22,20,22,20,22,20,22,63,22,20,22,63,22,20,22,20,22,63,22,63,22,63,22,1430,342,171,22,63,22,20,22,63,22,20,22,20,22,63,22,20,22,63,22,20,22,63,22,20,22,63,22,63,22,20,22,63,22,20,22,20,22,63,22,20,22,63,22,63,22,20,22,20,22,20,22,63,22,20,22,63,22,20,22,20,22,63,22,63,22,63,22,4045",
    "receiver.volumeDown": "sendir,1:1,1,40453,1,1,189,4,4,317,22,63,22,21CD,20,23,13,72,18,25,12,73,19,24,9,4,4,73,14,28,8,77,10,75,11,32,6,79,13,30,9,76,16,69,20,22,13,72,19,24,12,31,8,35,8,35,9,34,10,33,11,73DCCCC,22,1086,214,294CDCD,13,30,8,77,11,32,4,81,5,123,4,4010",
    "receiver.volumeUp": "sendir,1:1,1,40453,1,1,342,170,22,63,22,21BCCBCBCBCBBCBCCBCBCCCCBCBCBBBB,22,1086ABCBCCBCBCB,21,22,12,73,15,70,12,31,5,80,7,36,4,127,4,2002,10,4010",
    "receiver.dvd": "sendir,1:1,1,40453,1,1,339,169,22,63,22,20,22,63,22,20,22,20,22,63,22,20,22,63,22,20,22,63,22,20,22,63,22,63,22,20,22,63,22,0,20,22,63,22,20,22,63,22,20,22,63,22,63,22,20,22,63,22,20,22,20,22,63,22,20,22,63,22,63,22,20,22,20,22,20,22,63,22,20,22,63,22,20,22,20,22,63,22,63,22,63,22,4006"
};

var iTach = require('globalcache').iTach;
var remote = new iTach({
    host: '192.168.1.13' // required: IP address of your iTach device
});

// transmit IR codes
remote.send(COMMANDS["tv.power"], function callback(err) {
    if (err) {
        throw new Error(err);
    } else {
        // command has been successfully transmitted to your iTach
    }
});
// or transmit IR code another way
remote.send({ir: COMMANDS["receiver.dvd"]}, function callback(err) {
    if (err) {
        throw new Error(err);
    } else {
        // command has been successfully transmitted to your iTach
    }
});
// transmit serial command
remote.send(COMMANDS["relay5v_on"], function callback(err) {
    if (err) {
        throw new Error(err);
    } else {
        // command has been successfully transmitted to your iTach
    }
});
// transmit serial command
remote.send({serial: COMMANDS["relay5v_off"]}, function callback(err) {
    if (err) {
        throw new Error(err);
    } else {
        // command has been successfully transmitted to your iTach
    }
});


// receive IR codes
remote.learn(function done(err, code) {
    if (err) {
        throw new Error(err);
    } else {
        console.log("Received code", code);
    }
});

```

TODO:
-----
- Rewrite `learn` method to use TCP sockets instead HTTP REST API
- Add HEX IR code support
- Rework queue processing based on feedbacks and timeouts, remove DELAY_BETWEEN_COMMANDS
- Add Flex support
- Add support of RS232 (iTach WF2SL or IP2SL)