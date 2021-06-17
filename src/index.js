const express = require('express'),
    bodyParser = require('body-parser'),
    webapp = express(),
    nocache = require('nocache'),
    swaggerUi = require('swagger-ui-express'),
	moment = require('moment-timezone'),
    configs = require('./configs.js'),
	swaggerDocument = require('./swagger.json'),
    Logger = require('./logger.js'),
    rocketchat = require('./rocketchat.js'),
    logger = new Logger(configs.logging);

webapp.listen(configs.port);

webapp.use(bodyParser.urlencoded({ extended: false }));
webapp.use(bodyParser.json({ type: 'application/json', limit: '50mb' }));
webapp.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
webapp.use(bodyParser.text({ type: 'text/html' }));
//todo
//webapp.use(cookieParser());
//webapp.use(cookieSession({name: 'relay',keys: ['a8e4cef6-f9c8-abec-8344-554a65c6739f'],maxAge: 30 * 24 * 60 * 60 * 1000}));
webapp.use(nocache());

webapp.use('/chathost/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));  // TODO
webapp.use('/chathost', express.static('www/'));

webapp.use('/chathost/healthcheck', function health(req, res) {
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Healthy`);
 	res.sendStatus(200);
});
webapp.use('/chathost/admin', async function (req, res, next) {
	// todo: finish security later
	console.log('Security Bypass');
	next();
});

webapp.use('/chathost/admin', require('./routes/admin.js'));
// General Route

webapp.use(async function (req, res, next) {
	// todo: finish security later
	if (!req.headers['x-boxid'] || !req.headers.authorization) {
		logger.log('error', `${req.boxid}: ${req.method} ${req.originalUrl}: Unauthorized Request: Missing Authorization Credentials`);
		res.sendStatus(401);
	}
	else if (await mongo.checkAPIKeys(req.headers['x-boxid'],req.headers.authorization)) {
		req.boxid = req.headers['x-boxid'];
		req.boxauthorization = req.headers.authorization;
		next();		
	}
	else {
		logger.log('error', `${req.boxid}: ${req.method} ${req.originalUrl}: Unauthorized Request: Invalid Authorization Credentials`);
		res.sendStatus(401);
	}
});

webapp.use('/chathost/messageStatus', require('./routes/messageStatus.js'));
webapp.use('/chathost/courseRosters', require('./routes/courseRosters.js'));
webapp.use('/chathost/messages', require('./routes/messages.js'));
webapp.use('/chathost/attachments', require('./routes/attachments.js'));
webapp.use('/chathost/logs', require('./routes/logs.js'));
webapp.use('/chathost/settings', require('./routes/settings.js'));

