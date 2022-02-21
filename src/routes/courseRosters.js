const express = require('express'),
    router = express.Router()
    configs = require('../configs.js'),
    mongo = require('../mongo.js'),
    rocketchat = require('../rocketchat.js'),
    Logger = require('../logger.js'),
   	moment = require('moment-timezone'),
    logger = new Logger(configs.logging),
    { v4: uuidv4 } = require('uuid');

//  Put in the courseRoster data
router.post('/', async function postRosters(req, res) {
	req.body[0].authorization = req.headers.authorization;
	mongo.setCourseRoster(req.boxid,req.body,req.headers['x-forwarded-for'] || req.socket.remoteAddress, async function(result) {
		logger.log('debug', `boxId: ${req.boxid}: ${req.method} ${req.originalUrl}: ${result}`);
		await processRosters(req.boxid,req.body);
	    res.sendStatus(200);
	});
});

async function processRosters(boxid,body,ip) {
	logger.log('info', `boxId: ${boxid}: process.rosters: Start`);
	//logger.log('info', JSON.stringify(body));
	// Go through each course and find the teachers, students and establish Rocketchat accounts and welcome messages
	for (var course of body) {
		//logger.log('info', course);
		logger.log('debug', `boxId: ${boxid}: processRosters: Course: ${course.course_name}`)
		var teachers = [];
		// Iterate teachers, create if needed
		for (var teacher of course.teachers) {
			var username = teacher.username;  // Teachers don't have a boxid but students do
			logger.log('debug', `boxId: ${boxid}: processRosters: Teacher: ${username}`);
			var user = await rocketchat.getUser(boxid,username);
			teachers.push(username);
			if (!user || !user.username) {
				logger.log('error', `boxId: ${boxid}: processRosters: Course: ${course.id}: No Teacher Found: ${JSON.stringify(teacher)}`);
			}
			await rocketchat.classChatGroup(boxid,null,username,course.course_name,true);
		}
		// Iterate through students, create if needed, establish chatroom between teacher and student and fire a welcome message
		for (var student of course.students) {
			var username = `${student['username']}.${boxid}`;  // Teachers don't have a boxid but students do
			logger.log('debug', `boxId: ${boxid}: processRosters: Student: ${username}`);
			var user = await rocketchat.getUser(boxid,username);
			if (!user || !user.username) {
				user = await rocketchat.createUser(boxid,{username:username,email:`${username}@none.com`,password:uuidv4(),name:`${student['first_name']} ${student['last_name']}`,customFields:{wellId:boxid}})
				var chat = await rocketchat.createChat(boxid,[username,teachers[0]]);
				var welcome = await rocketchat.sendMessage(boxid,username,teachers[0],`You have a new student in ${course['course_name']} at ${boxid}: ${student['first_name']} ${student['last_name']} (${username})`);
			}
			await rocketchat.classChatGroup(boxid,username,teachers[0],course.course_name,false);
		}
	}
	return (true);
}

module.exports = router;
