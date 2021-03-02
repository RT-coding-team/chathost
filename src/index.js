const express = require('express'),
    bodyParser = require('body-parser'),
    webapp = express(),
    nocache = require('nocache'),
    swaggerUi = require('swagger-ui-express'),
	moment = require('moment-timezone'),
    configs = require('./configs.js')



webapp.listen(configs.port);
//webapp.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));  // TODO
webapp.use(bodyParser.urlencoded({ extended: false }));
webapp.use(bodyParser.json({ type: 'application/json', limit: '50mb' }));
webapp.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
webapp.use(bodyParser.text({ type: 'text/html' }));
webapp.use(nocache());

webapp.use('/api/messageStatus', require('./routes/messagestatus.js'));

//webapp.use('/', express.static('www/'));

