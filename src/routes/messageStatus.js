const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);

//  Get a list of all the districts being processed
router.get('/:boxid', async function apiDistricts(req, res) {
	var value = await mongo.getMessageStatusValue(req.params.boxid);
	logger.log('debug', `${req.method} ${req.url}: Last Sync: ${value}`);
    res.send(value);
});

module.exports = router;
