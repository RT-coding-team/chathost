const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    fs = require('fs'),
    mongo = require('../mongo.js'),
    rocketchat = require('../rocketchat.js'),
    messages = require('./messages.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);


// Authorization Functions
router.get('/chathost/auth', function getAuth(req, res) {
	console.log(req.session);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${req.session.username}`);
	res.send(req.session);
});
router.post('/chathost/auth', async function postAuth(req,res) {
	var result = await rocketchat.getLogin(req.body.username,req.body.password);
	if (!result.username) {
		logger.log('error', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${req.body.username} access denied`);
		res.redirect('/login.html');
	}
	else {
		req.session.username = result.username;
		logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${req.body.username} authorized`);
		console.log(req.session);
		res.redirect(req.body.redirect || '/dashboard');	
	}
});


module.exports = router;
