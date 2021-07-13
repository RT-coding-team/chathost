const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    rocketchat = require('../rocketchat.js'),
    Logger = require('../logger.js'),
   	moment = require('moment-timezone'),
    logger = new Logger(configs.logging);

//  Put in the courseRoster data
router.post('/', async function postRosters(req, res) {
	req.body[0].authorization = req.boxauthorization;
	mongo.setCourseRoster(req.boxid,req.body,req.headers['x-forwarded-for'] || req.socket.remoteAddress, async function(result) {
		logger.log('debug', `${req.boxid}: ${req.method} ${req.originalUrl}: ${result}`);
		await processRosters(req.boxid,req.body);
	    res.sendStatus(200);
	});
});

async function processRosters(boxid,body,ip) {
	logger.log('info', `process.rosters: ${boxid}`);
	//logger.log('info', JSON.stringify(body));
	// Go through each course and find the teachers, students and establish Rocketchat accounts and welcome messages
	for (var course of body) {
		//logger.log('info', course);
		logger.log('debug', `processRosters: Course: ${course.course_name}`)
		var teachers = [];
		// Iterate teachers, create if needed
		for (var teacher of course.teachers) {
			var username = teacher.username;  // Teachers don't have a boxid but students do
			logger.log('debug', `processRosters: Teacher: ${username}`);
			var user = await rocketchat.getUser(username);
			teachers.push(username);
			if (!user || !user.username) {
				logger.log('error', `processRosters: Course: ${course.id}: No Teacher Found: ${JSON.stringify(teacher)}`);
			}
		}
		// Iterate through students, create if needed, establish chatroom between teacher and student and fire a welcome message
		for (var student of course.students) {
			var username = `${student['username']}.${boxid}`;  // Teachers don't have a boxid but students do
			logger.log('debug', `processRosters: Student: ${username}`);
			var user = await rocketchat.getUser(username);
			if (!user || !user.username) {
				user = await rocketchat.createUser({username:username,email:`${username}@none.com`,password:username,name:`${student['first_name']} ${student['last_name']}`,customFields:{wellId:boxid}})
				var chat = await rocketchat.createChat([username,teachers[0]]);
				var welcome = await rocketchat.sendMessage(username,teachers[0],`You have a new student in ${course['course_name']} at ${boxid}: ${student['first_name']} ${student['last_name']} (${username})`);
			}
		}
	}
	return (true);
}

module.exports = router;
