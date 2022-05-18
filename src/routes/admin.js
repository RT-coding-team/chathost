const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    fs = require('fs'),
    mongo = require('../mongo.js'),
    rocketchat = require('../rocketchat.js'),
    messages = require('./messages.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);


//  Get the s data
router.get('/users', function getState(req, res) {
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: `);
	res.send(rocketchat.data);
});

router.get('/users/:userid', function getUser(req, res) {
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: `);
	try {
		var response = JSON.parse(JSON.stringify(rocketchat.data.users[req.params.userid]));
		if (!response || !response.username) {
			// Unknown user is 204
			res.sendStatus(204);
		}
		else if (req.params.userid.toLowerCase() === 'admin') {
			// Don't let Admin be searched
			res.sendStatus(401);
		}
		else {
			if (response && response.keys) {
				// Don't send API keys
				response.keys = {};
			}
			res.send(response);
		}
	}
	catch (err) {
		console.log(`	Could not retrieve user: ${req.params.user}: ${err}`);
		res.sendStatus(500);
	}
});

router.get('/boltURL', function getboltURL(req,res) {
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: `);
	res.send({url:configs.bolt});
})

router.get('/boxes', async function getBoxes(req, res) {
	var response = [];
	var boxes = await mongo.getBoxInventory();
	for (var box of boxes) {
		box.courses = 0;
		box.teachers = 0;
		box.students = 0;
		var courses = await mongo.getBoxRosters(box.boxid);
		if (courses && courses[0]) {	
			box.sitename = courses[0].sitename;
			box.siteadmin_name = courses[0].siteadmin_name;
			box.siteadmin_email = courses[0].siteadmin_email;
			box.siteadmin_phone = courses[0].siteadmin_phone;
			box.siteip = courses[0].siteip;
			box.courses = courses.length - 1;
			box.teachers = 0;
			box.students = 0;
			for (var course of courses) {
				if (course.teachers) {
					box.teachers += course.teachers.length;				
				}
				if (course.students) {
					box.students += course.students.length;				
				}
			}
		}
		response.push(box);
	}
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${response.length} Boxes Found`);
	res.send(response);
});

router.delete('/boxes/:boxid', async function getSecurity(req, res) {
	mongo.deleteCourseRoster(req.params.boxid);
	mongo.deleteSecurity(req.params.boxid);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: Done`);
	res.sendStatus(200);
});

router.get('/roster/:boxid', async function getRosters(req,res) {
	var response = await mongo.getBoxRosters(req.params.boxid);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${response.length} Courses`);
	res.send(response);
});

router.get('/system', async function getSystem(req,res) {
	try {
		var response = JSON.parse(fs.readFileSync('/tmp/system.json').toString() || '{}');
		logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: Last Updated: ${response.timestamp}`);
		res.send(response);
	}
	catch (err){
		logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${err}`);
		res.sendStatus(404);	
	}
});

//  Get the logs data  //todo
router.get('/logs/:boxid', async function getLogs(req, res) {
	var response = await mongo.getLogs(req.params.boxid);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${response.length} Logs`);
	res.send(response);
});

router.get('/settings/:boxid', async function getSettings(req, res) {
	var response = await mongo.getSettings(req.params.boxid,true);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${response.length} Settings Pending`);
	res.send(response);
});

router.post('/settings/:boxid', function putSetting(req,res) {
	mongo.putSetting(req.params.boxid,req.body.key,req.body.value);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${req.body.key} = ${req.body.value}`);
	res.send({});
});

router.delete('/settings/:boxid/:deleteId', async function putSetting(req,res) {
	var result = await mongo.deleteSetting(req.params.boxid,req.params.deleteId);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${req.params.deleteId}`);
	if (result) {
		res.sendStatus(200);
	}
	else {
		res.sendStatus(404);
	}
});

router.get('/security/:boxid', async function getSecurity(req, res) {
	var response = await mongo.getSecurity(req.params.boxid);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${response.length} Logs`);
	res.send(response);
});

router.put('/security/:boxid/:authorization', function putSecurity(req,res) {
	mongo.putSecurity(req.params.boxid,req.params.authorization);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${req.body.key} = ${req.body.value}`);
	res.send({});
});

router.delete('/security/:boxid', function putSecurity(req,res) {
	mongo.deleteSecurity(req.params.boxid);
	logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}`);
	res.send({});
});

router.get('/stats', async function getStats(req,res) {
	var mongoquery = {type:"content" || req.params.type};
	var parameters = ["boxid", "type", "country", "starttime", "endtime", "mediaType", "mediaIdentifier", "mediaProvider", "mediaLanguage", "interactionType"]
	for (var parameter of parameters) {
		if (req.query[parameter]) {
			if (parameter === 'starttime' || parameter === 'endtime') {
				mongoquery.timestamp = { $gte: parseInt(req.query.starttime) || 0, $lt:parseInt(req.query.endtime) || 3000000000};
				delete req.query.starttime;
				delete req.query.endtime;
			}
			else {
				mongoquery[parameter] = req.query[parameter];
			}
		}
	}
	res.send(await mongo.searchLogs(mongoquery));
})


module.exports = router;
