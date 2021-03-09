const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);

//  Put in the courseRoster data
router.post('/:boxid', async function postRosters(req, res) {
	console.log(req.body);
	mongo.setCourseRoster(req.params.boxid,req.body, function(result) {
	    res.sendStatus(result);
	});
});

module.exports = router;
