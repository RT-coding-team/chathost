const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);

router.get('/', async function apiDistricts(req, res) {
	var value = await mongo.getMessageStatusValue(req.boxid);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: Last Sync: ${value}`);
	rocketchat.prepareMessageSync(req.boxid,value); // Fire off process to prepare response 
    res.send(value);
});

module.exports = router;
