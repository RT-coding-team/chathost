const express = require('express'),
    bodyParser = require('body-parser'),
    webapp = express(),
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	cookieSession = require('cookie-session'),
    nocache = require('nocache'),
    swaggerUi = require('swagger-ui-express'),
	moment = require('moment-timezone'),
    configs = require('./configs.js'),
	swaggerDocument = require('./swagger.json'),
    Logger = require('./logger.js'),
    rocketchat = require('./rocketchat.js'),
    logger = new Logger(configs.logging);

webapp.listen(configs.port);

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
webapp.use('/chathost/images', express.static('www/images'));
webapp.use('/favicon.ico', express.static('www/favicon.ico'));

// Authorization Functions
webapp.get('/chathost/auth', function getAuth(req, res) {
	console.log(req.session);
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${req.session.username}`);
	res.send(req.session);
});
webapp.post('/chathost/auth', async function postAuth(req,res) {
	var result = await rocketchat.getLogin(req.body.username,req.body.password);
	if (!result.username) {
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
	res.redirect('/');
});

// This handles redirection to Moodle authoring
webapp.get('/chathost/authoring', function getAuth(req, res) {
	var prefix = req.get('host').split('.')[0] + '.';
	var newUrl = req.get('host').replace(prefix,'moodle.');
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Redirecting to ${newUrl}`);
	res.redirect(configs.authoring || newUrl);
});

// Check for authorization
webapp.use(async function (req, res, next) {
	// todo: finish security later
	if (req.session.username) {
		logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Existing Session for ${req.session.username}`);	
		next();
	}
	else if (await mongo.checkAPIKeys(req.headers['x-boxid'],req.headers.authorization)) {
		req.boxid = req.headers['x-boxid'];
		req.boxauthorization = req.headers.authorization;
		next();		
	}
	else {
		logger.log('error', `${req.boxid}: ${req.method} ${req.originalUrl}: Unauthorized Request: Invalid Authorization Credentials`);
		res.status(401);
		res.redirect('/chathost/login.html');
	}
});

// These resources require authorization
webapp.use('/chathost/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));  // TODO
webapp.use('/dashboard', express.static('www/'));
webapp.use('/chathost', express.static('www/'));

webapp.use('/chathost/admin', require('./routes/admin.js'));
webapp.use('/chathost/messageStatus', require('./routes/messageStatus.js'));
webapp.use('/chathost/courseRosters', require('./routes/courseRosters.js'));
webapp.use('/chathost/messages', require('./routes/messages.js'));
webapp.use('/chathost/attachments', require('./routes/attachments.js'));
webapp.use('/chathost/logs', require('./routes/logs.js'));
webapp.use('/chathost/settings', require('./routes/settings.js'));

