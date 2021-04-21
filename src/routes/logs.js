const express = require('express'),
	multer = require('multer'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);
    
const upload = multer({limits: { fileSize: 1000000000 }}); // This is set to 1Gig but is really governed by nginx.conf.  Modify nginx.conf and reload nginx.



//  Put in the log data
router.post('/', async function postLogs(req, res) {
	mongo.setLogs(req.boxid,req.body, function(result) {
		logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${result}`);
	    res.sendStatus(result);
	});
});


module.exports = router;