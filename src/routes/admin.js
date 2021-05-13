const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    rocketchat = require('../rocketchat.js'),
    messages = require('./messages.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);


//  Get the s data
router.get('/users', function getState(req, res) {
	res.send(rocketchat.data);
});

//  Get the s data
router.get('/messageQueue', function getState(req, res) {
	res.send(messages.messageQueue);
});

module.exports = router;
