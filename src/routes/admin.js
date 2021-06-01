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
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: `);
	res.send(rocketchat.data);
});

router.get('/boxes', async function getBoxes(req, res) {
	var response = [];
	var boxes = await mongo.getBoxInventory();
	for (var boxid of boxes) {
		var box = {};
		box.boxid = boxid;
		box.courses = 0;
		box.teachers = 0;
		box.students = 0;
		var courses = await mongo.getBoxRosters(boxid);
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
		response.push(box);
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

router.get('/system', async function getRosters(req,res) {
	var response = JSON.parse(fs.readFileSync('/tmp/system.json').toString());
	logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: Last Updated: ${response.timestamp}`);
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
