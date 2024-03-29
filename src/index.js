const express = require('express'),
    bodyParser = require('body-parser'),
    webapp = express(),
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	cookieSession = require('cookie-session'),
    nocache = require('nocache'),
	moment = require('moment-timezone'),
    configs = require('./configs.js'),
    Logger = require('./logger.js'),
    rocketchat = require('./rocketchat.js'),
    logger = new Logger(configs.logging);

webapp.listen(configs.port);
webapp.use(async function (req, res, next) {
	req.boxid = await mongo.checkAPIKeys(req.headers['x-boxid'],req.headers.authorization);
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Received`);
	next();
});

webapp.use(bodyParser.json({ type: 'application/json', limit: '50mb' }));
webapp.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
webapp.use(bodyParser.text({ type: 'text/html' , limit: '50mb'}));
webapp.use(cookieParser());
webapp.use(cookieSession({name: 'relaytrust',keys: ['81143184-d876-11eb-b8bc-0242ac130003'],maxAge: 24 * 60 * 60 * 1000}));


webapp.use('/chathost/healthcheck', function health(req, res) {
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Healthy`);
 	res.sendStatus(200);
});

// These resources are available without a password
webapp.use('/chathost/login.html', express.static('www/login.html'));
webapp.use('/chathost/public', express.static('www/public'));
webapp.use('/chathost/images.html', express.static('www/images.html'));
webapp.use('/chathost/images', express.static('www/images'));
webapp.use('/chathost/navigation.html', express.static('www/navigation.html'));
webapp.use('/favicon.ico', express.static('www/favicon.ico'));

// Authorization Functions
webapp.get('/chathost/auth', function getAuth(req, res) {
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${req.session.username}`);
	if (!req.session.username) {
		res.sendStatus(401);
	}
	else {
		res.send(req.session);
	}
});
webapp.post('/chathost/auth', async function postAuth(req,res) {
	var result = await rocketchat.getLogin(req.body.username,req.body.password);
	if (req.headers.host === 'localhost:2820'){
		req.session.username = req.body.username;
		logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: POSTMAN TESTS ${req.body.username} authorized`);
		res.redirect(req.body.redirect || '/dashboard');		
	}
	else if (!result.username) {
		logger.log('error', `${req.boxid}: ${req.method} ${req.originalUrl}: ${req.body.username} access denied`);
		res.redirect('/login.html');
	}
	else {
		req.session.username = result.username;
		logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${req.body.username} authorized`);
		console.log(req.session);
		res.redirect(req.body.redirect || '/dashboard');	
	}
});
webapp.get('/chathost/logout', function getAuth(req, res) {
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${req.session.username}`);
	req.session = null;
	res.redirect('/dashboard');
});

// This handles redirection to Moodle authoring
webapp.get('/chathost/authoring', function getAuth(req, res) {
	var moodle = process.env['CHATHOST_MOODLE'];
	res.redirect(moodle || '/dashboard');
});

// Check for authorization
webapp.use(async function (req, res, next) {
	if (req.session.username) {
		// Silent for Now
		next();
	}
	else if (req.boxid) {
		logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Authorized Boxid: ${req.boxid}: ${req.headers.authorization}`);	
		req.boxauthorization = req.headers.authorization;
		next();		
	}
	else if (req.headers['x-boxid']) {
		// Well box is sending credentials but they are invalid
		logger.log('error', `req.headers['x-boxid']: ${req.method} ${req.originalUrl}: Invalid Credentials`);	
		res.sendStatus(401);
	}
	else {
		// Probably a dashboard user that is not valid
		logger.log('error', `${req.boxid}: ${req.method} ${req.originalUrl}: Unauthorized Request: Invalid Authorization Credentials`);
		res.status(401).redirect('/chathost/login.html');
	}
});

// System Sync Functions for Well Box
webapp.use('/chathost/messageStatus', require('./routes/messageStatus.js'));
webapp.use('/chathost/courseRosters', require('./routes/courseRosters.js'));
webapp.use('/chathost/messages', require('./routes/messages.js'));
webapp.use('/chathost/attachments', require('./routes/attachments.js'));
webapp.use('/chathost/logs', require('./routes/logs.js'));
webapp.use('/chathost/settings', require('./routes/settings.js'));

// We have to recheck the authorization for a valid session for the admin functions
webapp.use(async function (req, res, next) {
	if (req.session.username) {
		logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Existing Session for ${req.session.username}`);	
		next();
	}
	else {
		logger.log('error', `${req.boxid}: ${req.method} ${req.originalUrl}: Unauthorized Request: Invalid Authorization Credentials`);
		res.status(401).redirect('/chathost/login.html');
	}
});

webapp.use('/chathost/admin', require('./routes/admin.js'));
webapp.use('/dashboard', express.static('www/'));
webapp.use('/chathost', express.static('www/'));
