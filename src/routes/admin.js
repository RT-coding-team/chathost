const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    rocketchat = require('../rocketchat.js'),
    messages = require('./messages.js'),
    Logger = require('../logger.js'),
    logger = new Logger(configs.logging);


//  Get the s data
router.get('/users', function getState(req, res) {
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: `);
	res.send(rocketchat.data);
});

router.get('/boxes', async function getBoxes(req, res) {
	var response = await mongo.getBoxInventory();
	for (var box of response) {
		box.courses = 0;
		box.teachers = 0;
		box.students = 0;
		var courses = await mongo.getBoxRosters(box.boxid);
		if (courses && courses[0]) {	
			box.sitename = courses[0].sitename;
			box.siteadmin_name = courses[0].siteadmin_name;
			box.siteadmin_email = courses[0].siteadmin_email;
			box.siteadmin_phone = courses[0].siteadmin_phone;
			box.courses = courses.length - 1;
			box.teachers = 0;
			box.students = 0;
			for (var course of courses) {
				box.teachers += course.teachers.length;
				box.students += course.students.length;
			}
		}
	}
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${response.length} Boxes Found`);
	res.send(response);
});

router.get('/roster/:boxid', async function getRosters(req,res) {
	var response = await mongo.getBoxRosters(req.params.boxid);
	response.shift();
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${response.length} Courses`);
	res.send(response);
});

//  Get the s data
router.get('/messageQueue', function getState(req, res) {
	res.send(messages.messageQueue);
});

router.post('/test', function getState(req, res) {
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}`);
	//res.send(rocketchat.data);
});

module.exports = router;
