const express = require('express'),
	multer = require('multer'),
	upload = multer(),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);


//  Get the messages data
router.get('/:attachmentId', async function getAttachments(req, res) {
 	var response = await mongo.getAttachmentsOutbound(req.params.attachmentId);
 	console.log(response);
	if (response.response === 200) {
		res.type(response.mimetype);
	 	res.send(response.file);
	}
	else {
		res.sendStatus(response.response);
	}
});

//  Put in the message data
router.post('/', upload.any(), async function postAttachments(req, res) {
	var body = req.body;
	body.file = req.files[0].buffer;
	body.mimetype = req.files[0].mimetype;
	body.size = req.files[0].size;
 	mongo.setAttachmentsInbound(body, function(result) {
 	    res.sendStatus(result);
 	});
});

module.exports = router;
