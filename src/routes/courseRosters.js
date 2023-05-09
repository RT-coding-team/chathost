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
	var sitename = '';
	for (var course of body) {
		if (course.sitename) {
			sitename = course.sitename;
		}
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
				logger.log('error', `boxId: ${boxid}: processRosters: Course: ${course.id}: Teacher Not Found: ${JSON.stringify(teacher)}.  CREATING...`);
				user = await rocketchat.createUser(boxid,{username:username,email:`${username}@none.com`,password:uuidv4(),name:`${teacher['first_name']} ${teacher['last_name']} at ${sitename}`,customFields:{wellId:boxid}})
			}
			else {
				await rocketchat.findClassChatGroup(boxid,username,sitename,course.course_name);
				await rocketchat.classChatGroup(boxid,null,username,sitename,course.course_name,true);
			}
			var roomId = await rocketchat.findClassChatGroup(boxid,username,sitename,course.course_name);
			var details = await rocketchat.getGroupDetails(boxid,roomId);
 			if (roomId && details.u && details.u.username) {
 				await rocketchat.getUser(boxid,details.u.username);
 				await rocketchat.joinGroup(boxid,username,details.u.username,sitename,course.course_name);
 			}
		}
		// Iterate through students, create if needed, establish chatroom between teacher and student and fire a welcome message
		for (var student of course.students) {
			var username = `${student['username']}.${boxid}`;  // Teachers don't have a boxid but students do
			logger.log('debug', `boxId: ${boxid}: processRosters: Student: ${username}`);
			var user = await rocketchat.getUser(boxid,username);
			if (!user || !user.username) {
				logger.log('debug', `boxId: ${boxid}: processRosters: Create Student: ${username}`);
				user = await rocketchat.createUser(boxid,{username:username,email:`${username}@none.com`,password:uuidv4(),name:`${student['first_name']} ${student['last_name']} at ${sitename}`,customFields:{wellId:boxid}})
			}
			for (var teacher of teachers) {
				if (!user.chats || !user.chats[teacher]) {
					logger.log('debug', `boxId: ${boxid}: processRosters: Creating Teacher/Student Chat: ${teacher} -> ${username} `);
					var chat = await rocketchat.createChat(boxid,[username,teacher]);
					var welcome = await rocketchat.sendMessage(boxid,username,teacher,`You have a new student in ${course['course_name']} at ${boxid}: ${student['first_name']} ${student['last_name']} (${username})`);
				}
				await rocketchat.classChatGroup(boxid,username,teacher,sitename,course.course_name,false);			
			}
		}
	}
	return (true);
}

module.exports = router;
