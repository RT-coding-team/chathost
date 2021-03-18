const express = require('express'),
    bodyParser = require('body-parser'),
    webapp = express(),
    nocache = require('nocache'),
    swaggerUi = require('swagger-ui-express'),
	moment = require('moment-timezone'),
    configs = require('./configs.js'),
	swaggerDocument = require('./swagger.json')



webapp.listen(configs.port);

webapp.use(function (req, res, next) {
	// todo: finish security later
	if (!req.headers['x-boxid'] || !req.headers.authorization) {
		res.sendStatus(401);
	}
	else {
		req.boxid = req.headers['x-boxid'];
	}
	next();
});


webapp.use('/chathost/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));  // TODO
webapp.use(bodyParser.urlencoded({ extended: false }));
webapp.use(bodyParser.json({ type: 'application/json', limit: '50mb' }));
webapp.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
webapp.use(bodyParser.text({ type: 'text/html' }));
webapp.use(nocache());




webapp.use('/chathost/messageStatus', require('./routes/messageStatus.js'));
webapp.use('/chathost/courseRosters', require('./routes/courseRosters.js'));
webapp.use('/chathost/messages', require('./routes/messages.js'));
webapp.use('/chathost/attachments', require('./routes/attachments.js'));

//webapp.use('/', express.static('www/'));

