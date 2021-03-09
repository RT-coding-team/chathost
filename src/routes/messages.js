const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);


//  Get the messages data
router.get('/:boxid', async function getMessages(req, res) {
	var value = await mongo.getMessagesOutbound(req.params.boxid);
	res.send(value);
});

//  Put in the message data
router.post('/:boxid', async function postMessages(req, res) {
	console.log(req.body);
	mongo.setMessagesInbound(req.params.boxid,req.body, function(result) {
	    res.sendStatus(result);
	});
});

module.exports = router;
