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

function parseQueryString(url) {
    //var query = url.split("?").pop();
    url = decodeURIComponent(url.replace(/\+/g, ' '));
    var query = url.substring(url.indexOf('?') + 1);
    var pairs = query.split('&');
    //console.log(pairs);
    var params = {};
    for (var i = 0; i < pairs.length; i++) {
        var temp = pairs[i].split('=');
        params[temp[0]] = temp[1];
    }
    if (params.switchip && params.url) {
        params.url = url.substring(url.indexOf('url=') + 4);
    }
    if (params.redirect) {
        params.redirect = url.substring(url.indexOf('redirect=') + 9);
    }
    params.query = query;
    return params;
}

module.exports = router;
