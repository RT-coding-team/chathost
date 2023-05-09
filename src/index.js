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
    mongo = require('./mongo.js'),
    logger = new Logger(configs.logging);


webapp.listen(configs.port);
webapp.use(async function (req, res, next) {
	if (req.headers.authorization) {
		var headers = req.headers.authorization.replace('Bearer ', '').split('|');
		req.boxid = await mongo.checkAPIKeys(headers[0],headers[1]);
		var isAuthorized = "No";
		if (req.boxid) {
			isAuthorized = "Yes";
		}
		logger.log('debug', `boxId: ${headers[0]}: ${req.method} ${req.originalUrl}: Check for Boxid and Auth: ${req.boxid}: ${headers[1]}: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}: Authorized? ${isAuthorized}`);
		next();
	}
	else {
		next();
	}
});

webapp.use(bodyParser.json({ type: 'application/json', limit: '50mb' }));
webapp.use (function (error, req, res, next){
	logger.log('error', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: Invalid JSON data: ${error}`);
    res.sendStatus(500);
});
webapp.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
webapp.use(bodyParser.text({ type: 'text/html' , limit: '50mb'}));
webapp.use(cookieParser());
webapp.use(cookieSession({name: 'relaytrust',keys: ['81143184-d876-11eb-b8bc-0242ac130003'],maxAge: 24 * 60 * 60 * 1000}));


webapp.use('/chathost/healthcheck', function health(req, res) {
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: Healthy`);
 	res.sendStatus(200);
});

webapp.use('/chathost/check', function check(req,res) {
	if (req.boxid) {
		res.sendStatus(200);
	}
	else {
		res.sendStatus(401);
	}
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
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: Check For Auth: ${req.session.username}`);
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
		logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: POSTMAN TESTS ${req.body.username} authorized`);
		res.redirect(req.body.redirect || '/dashboard');		
	}
	else if (!result.username) {
		logger.log('error', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress} access denied`);
		res.redirect('/login.html');
	}
	else {
		req.session.username = result.username;
		logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${req.body.username} authorized`);
		//console.log(req.session);
		res.redirect(req.body.redirect || '/dashboard');	
	}
});
webapp.get('/chathost/logout', function getAuth(req, res) {
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${req.session.username}`);
	req.session = null;
	res.redirect('/dashboard');
});

// This handles redirection to Bolt's list of packages
webapp.get('/chathost/link/openwell', function getboltURL(req,res) {
	res.redirect(configs.bolt + '/exporter/api/files.json');
});

// This handles redirection to Moodle authoring
webapp.get('/chathost/link/authoring', function getAuth(req, res) {
	var moodle = process.env['CHATHOST_MOODLE'];
	res.redirect(moodle || '/dashboard');
});

// This handles redirection to Moodle authoring
webapp.get('/chathost/link/cloud', function getAuth(req, res) {
	var bolt = process.env['CHATHOST_BOLT'];
	res.redirect(bolt || '/dashboard');
});

// Check for authorization
webapp.use(async function (req, res, next) {
	if (req.session.username) {
		// Silent for Now
		next();
	}
	else if (req.boxid) {
		//logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: Authorized Boxid: ${req.boxid}: ${req.headers.authorization}`);	
		req.boxauthorization = req.headers.authorization;
		next();		
	}
	else if (req.headers['x-boxid']) {
		// Well box is sending credentials but they are invalid
		logger.log('error', `boxId: ${req.headers['x-boxid']}: ${req.method} ${req.originalUrl}: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}: Invalid Credentials: Return 401`);	
		res.sendStatus(401);
	}
	else if (req.headers.authorization) {
		// Probably a dashboard user that is not valid
		logger.log('error', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: Unauthorized Request: Invalid Authorization Credentials: Return 401`);
		mongo.unauthorizedBoxes(req.headers.authorization);
		//console.log(req.headers);
		res.sendStatus(401);	
	}
	else {
		// Probably a dashboard user that is not valid
		logger.log('error', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: Unauthorized Request: Invalid Authorization Credentials: Redirect to Login`);
		//console.log(req.headers);
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
		//logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: Existing Session for ${req.session.username}`);	
		next();
	}
	else {
		logger.log('error', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}: Unauthorized Request: Invalid Authorization Credentials`);
		res.status(401).redirect('/chathost/login.html');
	}
});

webapp.use('/chathost/admin', require('./routes/admin.js'));
webapp.use('/dashboard', express.static('www/'));
webapp.use('/chathost', express.static('www/'));
