const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);


//  Get the messages data
router.get('/:attachmentId', async function getAttachments(req, res) {
	var value = await mongo.getAttachmentsOutbound(req.params.attachmentId);
	res.send(value);
});

//  Put in the message data
router.post('/', async function postAttachments(req, res) {
	console.log(req.body);
	mongo.setAttachmentsInbound(req.body, function(result) {
	    res.sendStatus(result);
	});
});

module.exports = router;
