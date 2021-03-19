const express = require('express'),
	multer = require('multer'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);
    
const upload = multer({limits: { fileSize: 1000000000 }}); // This is set to 1Gig but is really governed by nginx.conf.  Modify nginx.conf and reload nginx.


//  Get the attachment status
router.get('/:attachmentId/exists', async function getAttachments(req, res) {
 	var response = await mongo.getAttachmentsOutbound(`${req.boxid}-${req.params.attachmentId}`);
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${response.response}`);
	if (response.response === 200) {
		res.type(response.mimetype);
	 	res.send(response.response);
	}
	else {
		res.sendStatus(response.response);
	}
});


//  Get the attachment data
router.get('/:attachmentId', async function getAttachments(req, res) {
 	var response = await mongo.getAttachmentsOutbound(`${req.boxid}-${req.params.attachmentId}`);
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${response.response}`);
	if (response.response === 200) {
		res.type(response.mimetype);
	 	res.send(response.file);
	}
	else {
		res.sendStatus(response.response);
	}
});

//  Put in the attachment data
router.post('/', upload.any(), async function postAttachments(req, res) {
	var body = req.body;
	body.file = req.files[0].buffer;
	body.mimetype = req.files[0].mimetype;
	body.size = req.files[0].size;
	body.id = `${req.boxid}-${body.id}`;
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${body.id}`);
 	mongo.setAttachmentsInbound(body, function(result) {
 	    res.sendStatus(result);
 	});
});

module.exports = router;
