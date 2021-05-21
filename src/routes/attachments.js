const express = require('express'),
	multer = require('multer'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);
    
const upload = multer({limits: { fileSize: 1000000000 }}); // This is set to 1Gig but is really governed by nginx.conf.  Modify nginx.conf and reload nginx.


//  Get the attachment status
router.get('/:attachmentId/exists', async function getAttachmentExists(req, res) {
 	var response = await mongo.getAttachmentExists(`${req.boxid}-${req.params.attachmentId}`);
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${response.response}`);
	if (response.response === 200) {
		res.type(response.mimetype);
	 	res.sendStatus(response.response);
	}
	else {
		res.sendStatus(response.response);
	}
});

// Get missing attachments
router.get('/missing', async function getAttachments(req, res) {
 	var response = await mongo.findMissingAttachmentsInbound(req.boxid);
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${response.response}`);
	res.send(response);
});

//  Get the attachment data
router.get('/file-upload/:folder/:attachmentId', async function getAttachment(req, res) {
	var path = `${configs.rocketchat}/file-upload/${req.params.folder}/${req.params.attachmentId}`;
	console.log(`getAttachment: ${path}`);
	//var response = await rocketchat.getAttachment(path)
 	res.redirect(path);
});

//  Put in the attachment data
router.post('/', upload.any(), async function postAttachments(req, res) {
	var body = req.body;
	body.mimetype = req.files[0].mimetype;
	body.size = req.files[0].size;
	body.idWithBoxid = `${req.boxid}-${body.id}`;
	body.boxid = req.boxid;
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${body.idWithBoxid}`);
 	mongo.setAttachmentsInbound(body,req.files[0].buffer, function(result) {
 	    res.sendStatus(result);
 	});
});

module.exports = router;
