const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);


//  Get the messages data
router.get('/:boxid/:since', async function getMessages(req, res) {
	logger.log('debug', `${req.method} ${req.url}: Last Sync: ${value}`);
	var value = await mongo.getMessagesOutbound(req.params.boxid,req.params.since);
	res.send(value);
});

//  Put in the message data
router.post('/:boxid', async function postMessages(req, res) {
	logger.log('debug', `${req.method} ${req.url}: Last Sync: ${value}`);
	console.log(req.body);
	mongo.setMessagesInbound(req.params.boxid,req.body, function(result) {
	    res.sendStatus(result);
	});
});

module.exports = router;
