const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    rocketchat = require('../rocketchat.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);

//  Get the messages data
router.get('/:since', async function getMessages(req, res) {
	var value = await mongo.getMessagesOutbound(req.boxid,req.params.since);
	if (typeof value === 'number') {
		logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Error ${value}`);
		res.sendStatus(value);
	}
	else {
		logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Found ${value.length} messages`);
		res.send(value);
	}
});

//  Put in the message data
router.post('/', async function postMessages(req, res) {
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Received ${req.body.length} messages`);
	//console.log(req.body);
	// Iterate through array of messages
	for (var message of req.body) {
		// See if this message was already sent
		var messageId = `${req.boxid}-${message.id}`;
		var messageSent = await mongo.isMessageSentToRocketChat(messageId);
		if (messageSent) {
			logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${messageId}: Already Sent Message`);
			continue;
		}		
		// Check for validity of teacher:
		var teacher = await rocketchat.getUser(message.recipient.username);
		for (var email of teacher.emails) {
			if (email.address === message.recipient.email) {
				message.recipient.validated = true;
			}
		}
		if (message.recipient.validated) {
			if (message.attachment) {
				message.attachment.attachmentId = `${req.boxid}-${message.attachment.id}`;
				var result = await rocketchat.sendMessageWithAttachment(`${message.sender.username}.${req.boxid}`,`${message.recipient.username}`,message.attachment,message.conversation_id);  // Teachers don't have a boxid but students do
				if (result === true) {
					logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Successfully Sent ${messageId} from ${message.sender.username}.${req.boxid} to ${message.recipient.username}`);
	 				mongo.messageSentToRocketChat(req.boxid,messageId);
				}
				else {
					logger.log('error', `${req.boxid}: ${req.method} ${req.originalUrl}: Failed Send ${messageId} from ${message.sender.username}.${req.boxid} to ${message.recipient.username}`);				
				}
			}
			else {
				var result = await rocketchat.sendMessage(`${message.sender.username}.${req.boxid}`,`${message.recipient.username}`,message.message,message.conversation_id);  // Teachers don't have a boxid but students do
				if (result === true) {
					logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Successfully Sent ${messageId} from ${message.sender.username}.${req.boxid} to ${message.recipient.username}`);
	 				mongo.messageSentToRocketChat(req.boxid,messageId);
				}
				else {
					logger.log('error', `${req.boxid}: ${req.method} ${req.originalUrl}: Failed Send ${messageId} from ${message.sender.username}.${req.boxid} to ${message.recipient.username}`);				
				}
			}
		}
		else {
			logger.log('error', `${req.boxid}: ${req.method} ${req.originalUrl}: Failed on ${message.id}: Could not locate teacher by email: ${message.recipient.email}`);	
		}
	}
	res.sendStatus(200);
});

module.exports = router;
