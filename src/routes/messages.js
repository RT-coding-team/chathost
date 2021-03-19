const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);


//  Get the messages data
router.get('/:since', async function getMessages(req, res) {
	var value = await mongo.getMessagesOutbound(req.boxid,req.params.since);
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Found ${value.length} messages`);
	res.send(value);
});

//  Put in the message data
router.post('/', async function postMessages(req, res) {
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Received ${req.body.length} messages`);
	console.log(req.body);
	mongo.setMessagesInbound(req.boxid,req.body, function(result) {
	    res.sendStatus(result);
	});
});

module.exports = router;
