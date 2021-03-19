const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);

//  Put in the courseRoster data
router.post('/', async function postRosters(req, res) {
	mongo.setCourseRoster(req.boxid,req.body, function(result) {
		logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${result}`);
	    res.sendStatus(result);
	});
});

module.exports = router;
