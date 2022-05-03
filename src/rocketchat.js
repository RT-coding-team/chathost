const configs = require('./configs.js'),
    Logger = require('./logger.js'),
    logger = new Logger(configs.logging),
	moment = require('moment-timezone'),
	mongo = require('./mongo.js'),
	assert = require('assert'),
	url = configs.mongo,
	dbName = "chathost",
	request = require('request'),
	emojione = require('emojione'),
	execSync = require('child_process').execSync;	

	var data = {
		users: {},
		channels: {},
		groups: {}
	};

init();


async function init() {
	var serverAlive = await checkRocketChat();
	if (!serverAlive) {
		logger.log('info', `FATAL`);
		process.exit(1);
	}
	if (!data.users.ADMIN) {
		await getAdmin();
		if (!data.users.ADMIN) {
			logger.log('info', `FATAL`);
			process.exit(1);		
		}
		if (process.argv[2] == 'test') {
			test();
		}
	}
}


async function test() {
	var boxid='0a-74-4e-36-e1-77';
	var username='1.0a-74-4e-36-e1-77';
	//var username='derek.maxson';
	var courseName = 'FINAL:Course*With!Weird(Punctuation) andSpaces123.81238';
	var unique = moment().unix();
	//var unique = 6;

	await getUser(boxid,username);
	await getMessages(boxid,username,0);

	await getUser(boxid,'derek.maxson');
	await classChatGroup(boxid,null,'derek.maxson',courseName + unique,true);

	await classChatGroup(boxid,username,'derek.maxson',courseName + unique,false);

	//prepareMessageSync(boxid,1641581709)
	//await getGroups(boxid,username);
	console.log(data.users)
	
}



async function checkRocketChat() {
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/info',
			method: 'GET'
		}, function (err, res, body) {
			if (err) {
				logger.log('info', `checkRocketChat: ERROR: ${err}`);
				logger.log('error', `checkRocketChat: ERROR: ${err}`);		
				resolve (false);
			}
			else {
				if (body && body.includes('"success":true}')) {
					logger.log('info', `checkRocketChat: Connected Successfully to Rocketchat`);		
					resolve (true);
				}
				else {
					logger.log('error', `checkRocketChat: ERROR: ${body}`);		
					resolve (false);
				}
			}
		});
	});
    let result = await promise;
    return result;

}

async function getLogin(username,password) {
	logger.log('info', `getLogin: Attempting Login for ${username}`);
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/v1/login',
			body: `{"user":"${username}","password":"${password}"}`,
			method: 'POST'
		}, function (err, res, body) {
			body = JSON.parse(body);
			if (body && body.data && body.data.me && (body.data.me.roles.includes('admin') || body.data.me.roles.includes('leader'))) {
				logger.log('info', `getLogin: Successful Login For ${username}`);
				resolve ({username:body.data.me.username});
			}
			else {
				logger.log('error', `getLogin: ERROR: ${JSON.stringify(body)}`);
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;

}

async function getAdmin() {
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/v1/login',
			body: `{"user":"${configs.rocketchatadmin}","password":"${configs.rocketchatpassword}"}`,
			method: 'POST'
		}, function (err, res, body) {
			body = JSON.parse(body);
			if (body && body.data) {
				data.users.ADMIN = body.data.me;
				data.users.ADMIN.keys = {
					userId: body.data.userId,
					authToken: body.data.authToken
				};
				logger.log('info', `getAdmin: Successful Admin Connection`);
				resolve (true);
			}
			else {
				logger.log('error', `getAdmin: ERROR: ${JSON.stringify(body)}`);
				resolve (false);
			}
		});
	});
    let result = await promise;
    return result;
}
 
async function getToken(boxid,username) {
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users.ADMIN.keys.userId,
				'X-Auth-Token': data.users.ADMIN.keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/v1/users.createToken',
			body: `{"username":"${username}"}`,
			method: 'POST'
		}, function (err, res, body) {
			body = JSON.parse(body);
			if (body && body.data) {
				data.users[username].keys = body.data;
				logger.log('debug', `boxId: ${boxid}: getToken: ${username}: ${JSON.stringify(body.data)}`)
				resolve (body.data);
			}
			else {
				logger.log('error', `boxId: ${boxid}: getToken: ${username}: ERROR: ${JSON.stringify(body)}`)
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}

async function getUser(boxid,username) {
	logger.log('info', `boxId: ${boxid}: getUser: ${username}`);
    let promise = new Promise((resolve, reject) => {
		if (data.users[username]) {
			resolve (data.users[username]);		
		}
		else {		
			request({
				headers: {
					'X-User-Id': data.users.ADMIN.keys.userId,
					'X-Auth-Token': data.users.ADMIN.keys.authToken,
					'Content-Type': 'application/json'
				},
				uri: configs.rocketchat + `/api/v1/users.info?username=${username}`,
				method: 'GET'
			}, async function (err, res, body) {
				body = JSON.parse(body);
				if (body && body.user) {
					logger.log('debug', `boxId: ${boxid}: getUser: ${username} Cached`);
					data.users[username] = body.user;
					data.users[username].keys = await getToken(boxid,username);
					data.users[username].chats = await getChats(boxid,username);
					data.users[username].groupChats = await getGroups(boxid,username);

					if (!data.users[username].groups) {
						data.users[username].groups = {};
					}
					logger.log('debug', `boxId: ${boxid}: getUser: ${username} Details Found`);
					resolve (data.users[username]);		
				}
				else {
					logger.log('error', `boxId: ${boxid}: getUser: A username '${username}' Not Found`);
					resolve ({});
				}
			});
		}
	});
    let result = await promise;
    return result;
}


async function getChats(boxid,username) {
	logger.log('info', `boxId: ${boxid}: getChats: ${username}: Locating Chat Rooms`);
	if (!data.users[username]) {
		await getUser(username);
	}
	if (!data.users[username].keys) {
		await getToken(username);
	}
	var response = {};
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users[username].keys.userId,
				'X-Auth-Token': data.users[username].keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/v1/im.list'
		}, function (err, res, body) {
			try {
				body = JSON.parse(body);
			}
			catch (err){
				console.log(`boxId: ${boxid}: getChats: Error: ${err}`);
				body = {};
			}
			if (body && body.ims) {
				for (var im of body.ims) {
					for (var imUsername of im.usernames) {
						if (imUsername !== username && im.usersCount === 2) {
							response[imUsername] = im['_id'];
							logger.log('info', `boxId: ${boxid}: getChats: ${username} -> ${imUsername}: ${response[imUsername]}`);
						}
					}
				}
				data.users[username].chats = response;
				logger.log('debug', `boxId: ${boxid}: getChats: ${username} Found ${Object.keys(data.users[username].chats).length} chats`);
				resolve (response);
			}
			else {
				logger.log('error', `boxId: ${boxid}: getChats: ${username}: ERROR: ${JSON.stringify(body)}`)
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}

async function getGroups(boxid,username) {
	logger.log('info', `boxId: ${boxid}: getGroups: ${username}: Locating Groups`);
	if (!data.users[username]) {
		await getUser(username);
	}
	if (!data.users[username].keys) {
		await getToken(username);
	}
	var theseGroups = {};
	var theseChats = [];
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users[username].keys.userId,
				'X-Auth-Token': data.users[username].keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/v1/groups.list'
		}, function (err, res, body) {
			try {
				body = JSON.parse(body);
			}
			catch (err){
				console.log(`boxId: ${boxid}: getGroups: Error: ${err}`);
				body = {};
			}
			if (body && body.groups) {
				for (var group of body.groups) {
					theseGroups[group.name] = group._id;
					data.groups[group.name] = group._id;
					logger.log('info', `boxId: ${boxid}: getGroups: ${group.name} (${group._id}): Member: ${username}`);
					if (group.u.username !== username && group.lastMessage) {
						theseChats.push(group.lastMessage.rid);
						logger.log('info', `boxId: ${boxid}: getGroups: ${group.name}: Message: ${username} -> ${group.u.username}: ${group.lastMessage.rid}`);
					}
				}
				data.users[username].groups = theseGroups;
				data.users[username].groupChats = theseChats;
				logger.log('debug', `boxId: ${boxid}: getGroups: ${username} Found ${Object.keys(data.users[username].groups).length} groups`);
				resolve (theseChats);
			}
			else {
				logger.log('error', `boxId: ${boxid}: getGroups: ${username}: ERROR: ${JSON.stringify(body)}`)
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}

async function getGroupDetails(boxid,roomId) {
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users.ADMIN.keys.userId,
				'X-Auth-Token': data.users.ADMIN.keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + `/api/v1/groups.listAll?query={ "_id": { "$eq": "${roomId}" } }`,
			method: 'GET'
		}, async function (err, res, body) {
			if (err) {
				logger.log('debug', `boxId: ${boxid}: getGroupDetails: ERROR: ${err}`);
				resolve(false);
			}
			else {
 				body = JSON.parse(body);
				if (body.groups && body.groups[0]) {
					logger.log('debug', `boxId: ${boxid}: getGroupDetails: Found Existing Group in Rocketchat: ${roomId}: ${body.groups[0].u.username}: ${body.groups[0].name}`);
					resolve(body.groups[0]);
				}
				else {
					logger.log('debug', `boxId: ${boxid}: getGroupDetails: ${roomId}: NO Existing Group in Rocketchat`);
					resolve (false);
				}
			}
		});
	});
    let result = await promise;
    return result;	
}

async function findClassChatGroup(boxid,teacher,sitename,courseName) {
	var boxCourseName = `${boxid}.${sitename}.${removePunctuation(courseName)}`;
	logger.log('debug', `boxId: ${boxid}: findClassChatGroup: ${teacher}: ${courseName}: Checking Course Group Chat. ${boxCourseName}: ID: ${data.groups[boxCourseName]}`);
	if (data.groups[boxCourseName]) {
		return (data.groups[boxCourseName]);
	}
	else {
		await findGroup(boxid,boxCourseName);
	}
}

async function findGroup(boxid,boxCourseName) {
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users.ADMIN.keys.userId,
				'X-Auth-Token': data.users.ADMIN.keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + `/api/v1/groups.listAll?query={ "name": { "$eq": "${boxCourseName}" } }`,
			method: 'GET'
		}, async function (err, res, body) {
			if (err) {
				logger.log('debug', `boxId: ${boxid}: findGroup: ${boxCourseName}: ERROR: ${err}`);
				resolve(false);
			}
			else {
 				body = JSON.parse(body);
				if (body.groups && body.groups[0]) {
					data.groups[boxCourseName] = body.groups[0]._id;
					logger.log('debug', `boxId: ${boxid}: findGroup: ${boxCourseName}: Found Existing Group in Rocketchat: ${data.groups[boxCourseName]}`);
					resolve(data.groups[boxCourseName]);					
				}
				else {
					logger.log('debug', `boxId: ${boxid}: findGroup: ${boxCourseName}: NO Existing Group in Rocketchat`);
					resolve (false);
				}
			}
		});
	});
    let result = await promise;
    return result;	
}

async function classChatGroup(boxid,username,teacher,sitename,courseName,isTeacher){
	var boxCourseName = `${boxid}.${sitename}.${removePunctuation(courseName)}`;
	if (username) {
		logger.log('debug', `boxId: ${boxid}: classChatGroup: ${username} (Teacher? ${isTeacher}): Checking Course Group Chat. ${boxCourseName}: ID: ${data.groups[boxCourseName]}`);
	}
	else if (teacher) {
		logger.log('debug', `boxId: ${boxid}: classChatGroup: ${teacher} (Teacher? ${isTeacher}): Checking Course Group Chat. ${boxCourseName}: ID: ${data.groups[boxCourseName]}`);
	}
	if (data.users[username] && !data.users[username].groups) {
		data.users[username].groups = {};
	}
	if (!data.groups[boxCourseName] && isTeacher) {
		logger.log('debug', `boxId: ${boxid}: classChatGroup: ${teacher} (Teacher? ${isTeacher}): Creating Course Group Chat. ${boxCourseName}`);
		await createGroup(boxid,teacher,sitename,courseName);
	}
	else if (isTeacher) {
		logger.log('debug', `boxId: ${boxid}: classChatGroup: ${teacher} (Teacher? ${isTeacher}): Existing Course Group Chat: ${boxCourseName}: ${data.groups[boxCourseName]}: ID: ${data.groups[boxCourseName]}`);	
	}
	else if (!data.groups[boxCourseName]) {
		logger.log('error', `boxId: ${boxid}: classChatGroup: ${username} (Teacher? ${isTeacher}): ${boxCourseName}:This course has not been created yet a student should be joining -- no teacher?  Other issue?`);			
	}
	else if (data.groups[boxCourseName] && username && !data.users[username].groups[boxCourseName]) {
		logger.log('debug', `boxId: ${boxid}: classChatGroup: ${username} (Teacher? ${isTeacher}): ${boxCourseName}: Joining Course Group Chat`);		
		await joinGroup(boxid,username,teacher,sitename,courseName);
	}
	else {
		logger.log('debug', `boxId: ${boxid}: classChatGroup: ${username} (Teacher? ${isTeacher}): ${boxCourseName}: Already In Course Group Chat: ${boxCourseName}: ID: ${data.groups[boxCourseName]}`);	
	}
	return(true);
}

async function joinGroup(boxid,username,teacher,sitename,courseName) {
	var boxCourseName = `${boxid}.${sitename}.${removePunctuation(courseName)}`;
	var groupToJoin = await findGroup(boxid,boxCourseName);
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users[teacher].keys.userId,
				'X-Auth-Token': data.users[teacher].keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/v1/groups.invite',
			body: JSON.stringify({roomId:groupToJoin, userId: data.users[username]._id}),
			method: 'POST'
		}, async function (err, res, body) {
 			body = JSON.parse(body);
			if (err && err.errorType === 'error-duplicate-channel-name') {
				logger.log('debug', `boxId: ${boxid}: joinGroup: ${username}: ${boxCourseName}: Found Existing Course`); // todo
				resolve(false);
			}
			else if (!body.group || !body.group._id) {
				logger.log('debug', `boxId: ${boxid}: joinGroup: ${username}: ${boxCourseName}: Could Not Find Existing Course Group Chat`); // todo
				resolve(false);
			}
			else {
				if (!data.users || !data.users[username]) {
					await getUser(username);
				}
				if (!data.users[username].groups) {
					data.users[username].groups = {};
				}
 				data.users[username].groups[boxCourseName] = body.group._id;
 				data.groups[boxCourseName] = body.group._id;
 				logger.log('debug', `boxId: ${boxid}: createGroup: ${username}: ${boxCourseName}: Invited to Join Course Group Chat: ${body.group._id}`);
				resolve(true);
			}
		});
	});
    let result = await promise;
    return result;	
}

async function createGroup(boxid,username,sitename,courseName) {
	var boxCourseName = `${boxid}.${sitename}.${removePunctuation(courseName)}`;
	if (!data.users[username]) {
		logger.log('error', `boxId: ${boxid}: createGroup: ${username}: ${boxCourseName}: Username not found`);
		return false;
	}
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users[username].keys.userId,
				'X-Auth-Token': data.users[username].keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/v1/groups.create',
			body: JSON.stringify({name:boxCourseName,members:[username]}),
			method: 'POST'
		}, async function (err, res, body) {
			if (err && err.errorType === 'error-duplicate-channel-name') {
				logger.log('debug', `boxId: ${boxid}: createGroup: ${username}: ${boxCourseName}: Found Existing Course`); // todo
				resolve(false);
			}
			else if (err) {
				logger.log('error', `boxId: ${boxid}: createGroup: ${username}: ${boxCourseName}: ${JSON.stringify(err)}`); 
			}
			else {
				body = JSON.parse(body);
				if (!body.success) {
					logger.log('error', `boxId: ${boxid}: createGroup: ${username}: ${boxCourseName}: ${JSON.stringify(body)}`); 
					resolve (false);
				}
				else {
					data.users[username].groups[boxCourseName] = body.group._id;
					data.groups[boxCourseName] = body.group._id;
					logger.log('debug', `boxId: ${boxid}: createGroup: ${username}: ${boxCourseName}: Created: ${body.group._id}`);
					resolve (true);
				}
			}
		});
	});
    let result = await promise;
    return result;	
}

async function createUser(boxid,user) {
	logger.log('info', `createUser: ${user.username}`);
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users.ADMIN.keys.userId,
				'X-Auth-Token': data.users.ADMIN.keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/v1/users.create',
			body: JSON.stringify(user),
			method: 'POST'
		}, async function (err, res, body) {
			try {
				body = JSON.parse(body);
			}
			catch (err){
				console.log(`boxId: ${boxid}: createUser: Error: ${err}`);
				body = {};
			}
			if (body && body.user) {
				var username = user.username;
				data.users[username] = body.user;
				data.users[username].keys = await getToken(boxid,username);
				data.users[username].chats = await getChats(boxid,username);
				logger.log('debug', `boxId: ${boxid}: createUser: ${user.username} Successful`);
				resolve (data.users[username]);		
			}
			else {
				logger.log('error', `boxId: ${boxid}: createUser: ${user.username} Failed: ${JSON.stringify(body)}`);
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}

async function createChat(boxid,people) {
	logger.log('debug', `boxId: ${boxid}: createChat: ${JSON.stringify(people)}`);
    let promise = new Promise((resolve, reject) => {
		var postdata = {
			usernames:people.join()
		};
		//logger.log('info', JSON.stringify(postdata));
		request({
			headers: {
				'X-User-Id': data.users[people[0]].keys.userId,
				'X-Auth-Token': data.users[people[0]].keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/v1/im.create',
			body: JSON.stringify(postdata),
			method: 'POST'
		}, function (err, res, body) {
			try {
				body = JSON.parse(body);
			}
			catch (err){
				console.log(`boxId: ${boxid}: createChat: Error: ${err}`);
				body = {};
			}
 			if (body && body.room) {
				logger.log('debug', `boxId: ${boxid}: createChat: ${people.join()}: roomId: ${body.room.rid}`);
 				resolve (true);
 			}
 			else {
				logger.log('error', `boxId: ${boxid}: createChat: ${people.join()}: FAILED`);
 				resolve (false);
 			}
		});
	});
    let result = await promise;
    return result;
}

async function sendMessage(boxid,fromUsername,toUsername,message) {
	logger.log('info', `boxId: ${boxid}: sendMessage: ${fromUsername} -> ${toUsername}: ${message}`);
	if (!data.users[fromUsername]) {
		await getUser(fromUsername);
	}
	if (!data.users[toUsername]) {
		await getUser(toUsername);
	}
	if (!data.users[fromUsername].chats || !data.users[fromUsername].chats[toUsername]) {
		await createChat(boxid,[fromUsername,toUsername]);
		await getChats(boxid,fromUsername);
	}
    let promise = new Promise((resolve, reject) => {
		var postdata = {
			roomId: data.users[fromUsername].chats[toUsername],
			text: message
		};
		request({
			headers: {
				'X-User-Id': data.users[fromUsername].keys.userId,
				'X-Auth-Token': data.users[fromUsername].keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + '/api/v1/chat.postMessage',
			body: JSON.stringify(postdata),
			method: 'POST'
		}, function (err, res, body) {
			body = JSON.parse(body);
 			if (body && body.success) {
				logger.log('debug', `boxId: ${boxid}: sendMessage: ${fromUsername} -> ${toUsername}: ${message}: SUCCESS`);
 				resolve (true);
 			}
 			else {
				logger.log('error', `boxId: ${boxid}: sendMessage: ${fromUsername} -> ${toUsername}: ${message}: FAILED (${JSON.stringify(body)})`);
 				resolve (false);
 			}
		});
	});
    let result = await promise;
    return result;
}

//curl "https://chathost.derekmaxson.com/api/v1/rooms.upload/FFBYHK7q4MH3GDoZptizqhtTLKLg9rQvh7" -F file="@/tmp/sierrareplogosmall.png;type=image/png" -H "X-Auth-Token: 2ZLwN-HMp12MQDxfAFzXxmAH6VEGI_vr6x1gkPgBdzl" -H "X-User-Id: FFBYHK7q4MH3GDoZp"

async function sendMessageWithAttachment(boxid,fromUsername,toUsername,message) {
	logger.log('info', `boxId: ${boxid}: sendMessageWithAttachment: ${fromUsername} -> ${toUsername}: with attachment: ${message.id}`);
	if (!data.users[fromUsername]) {
		await getUser(fromUsername);
	}
	if (!data.users[toUsername]) {
		await getUser(toUsername);
	}
	if (!data.users[fromUsername].chats || !data.users[fromUsername].chats[toUsername]) {
		await createChat(boxid,[fromUsername,toUsername]);
		await getChats(boxid,fromUsername);
	}
	var roomId = data.users[fromUsername].chats[toUsername];
	if (!roomId) {
		logger.log('error', `boxId: ${boxid}: sendMessageWithAttachment: ${fromUsername} -> ${toUsername}: No valid chat room for that conversation`);
		return false;
	}
	var attachment = await mongo.getAttachmentExists(message.attachmentId);
    let promise = new Promise((resolve, reject) => {
		// Had to use curl because I could not determine how to pass the content type info in via request.js 
		var command = `curl -s "${configs.rocketchat}/api/v1/rooms.upload/${roomId}" -F file="@/tmp/${message.attachmentId};type=${attachment.mimetype}" -H "X-Auth-Token: ${data.users[fromUsername].keys.authToken}" -H "X-User-Id: ${data.users[fromUsername].keys.userId}"`
		try {
			var result = JSON.parse(execSync(command).toString());
			if (result.success === true) {
				resolve(true);
			}
			else {
				resolve(false);
			}
		}
		catch (err) {
			logger.log('error', `boxId: ${boxid}: sendMessageWithAttachment: FAILED: ${err}`);
			//sendMessage(boxid,fromUsername,toUsername,`The file sent to you, ${message.filename}, has failed to be delievered`,boxid);
			sendMessage(boxid,toUsername,fromUsername,`The file ${fromUsername} sent to ${toUsername}, ${message.filename}, has failed to be delievered`,boxid);
			resolve (false);
		}
	});
    let result = await promise;
    return result;
}

async function getAttachment(boxid,path) {
    let promise = new Promise((resolve, reject) => {
    	logger.log('info', `boxId: ${boxid}: getAttachment: ${configs.rocketchat}${path}`);
		request({
			uri: configs.rocketchat + path
		}, async function (err, res, body) {
			logger.log('info', body);
			resolve({code: 200, mimetype: res.headers['content-type'], body: Buffer.from(body)});
		});
	});
    let result = await promise;
    return result;
}

async function prepareMessageSync(boxid,since) {
	// Discover all users on this boxid
	var users = await getUserListForBox(boxid);
	var messages = []
	for (var username of users) {
		logger.log('debug', `boxId: ${boxid}: prepareMessageSync: Checking User: ${username}`);
		messages = messages.concat(await getMessages(boxid,username,since));
	}
	mongo.messageSync(boxid,since,messages);
}

async function getMessages(boxid,username,since) {
	logger.log('info', `boxId: ${boxid}: getMessages: ${username}`);
	if (!data.users[username]) {
		await getUser(boxid,username);
	}	
	if (!data.users[username].keys) {
		await getToken(boxid,username);
	}
	if (!data.users[username].chats) {
		await getChats(boxid,username);
	}
	if (!data.users[username].groupChats) {
		await getGroups(boxid,username);
	}
	var response = [];
	for (var roomId of Object.values(data.users[username].chats)) {
		logger.log('info', `boxId: ${boxid}: getMessages: ${username}: ${roomId}`);
		var messages = await getRoomMessages('im',boxid,username,roomId,since);
		response = response.concat(messages);
	}
	for (var roomId of data.users[username].groupChats) {
		logger.log('info', `boxId: ${boxid}: getMessages: ${username}: ${roomId}`);
		var messages = await getRoomMessages('groups',boxid,username,roomId,since);
		response = response.concat(messages);
	}
	mongo.setMessageStatusValue(boxid);
	return (response);
}

async function getRoomMessages(roomType,boxid,username,roomId,since) {
	logger.log('debug', `boxId: ${boxid}: getRoomMessages: ${roomType}: ${username}: ${roomId}: Since ${moment(since*1000).format()}`);
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users[username].keys.userId,
				'X-Auth-Token': data.users[username].keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + `/api/v1/${roomType}.history?roomId=${roomId}&count=100&oldest=${moment(since*1000).tz('America/Los_Angeles').format()}`
		}, async function (err, res, body) {
			try {
				body = JSON.parse(body);
			}
			catch (err){
				console.log(`boxId: ${boxid}: getRoomMessages: Error: ${err}`);
				body = {};
			}
			var response = [];
 			if (body && body.messages && body.messages.length > 0) {
				logger.log('debug', `boxId: ${boxid}: getRoomMessages: ${roomType}: ${username}: ${roomId}: Found ${body.messages.length} messages`);
				var messages = body.messages.sort(sortOnTimestamp);	
				for (var message of messages) {
					logger.log('debug', `boxId: ${boxid}: getRoomMessages: ${roomType}: ${username}: ${roomId}: Checking Message: ${message._id}: ${message.u.username}`);
					if (message.u.username === username) {
						logger.log('debug', `boxId: ${boxid}: getRoomMessages: ${roomType}: ${username}: ${roomId}: Skipping self-sent message: ${message._id}`);
					}
					else {
						logger.log('info', JSON.stringify(message));
						var moodleMessage = {
							id: message._id,
							subject: null,
							message: emojione.shortnameToUnicode(convertEmojiTone(message.msg)),
							sender: {
								username: message.u.username,  // Sender should always be a "teacher" or admin on Rocketchat
							},
							recipient: {
								username: username.substr(0, username.lastIndexOf("."))   // Recipient should always been on the Moodle box.
							},
							"created_on": moment(message.ts).unix()				
						}
						if (message.attachments && message.attachments[0]) {
							var type = 'document';  // default
							if (message.file && message.file.type) {
								type = message.file.type.split('/')[0];
							}
							if (type === 'image') {
								type = 'photo';
							}
							else if (type !== 'video' && type !== 'audio') {
								type = 'document';
							}
							moodleMessage.message = `<attachment type="${type}" id="${moment(message.ts).valueOf()}" filename="${message.file.name}" filepath="${message.attachments[0].title_link}">`;
						}
						logger.log('debug', `boxId: ${boxid}: getRoomMessages: ${roomType}: ${username}: ${roomId}: Sending message: ${message._id} from ${message.u.username}: ${moodleMessage.message}`);
						logger.log('debug', `boxId: ${boxid}: getRoomMessages: ${roomType}: Message: ${JSON.stringify(moodleMessage)}`);
						response.push(moodleMessage);
					}
				}	
				
				logger.log('info', `boxId: ${boxid}: getRoomMessages: ${roomType}: ${username}: ${roomId}: Sending ${response.length} messages`);
 				resolve (response);
 			}
 			else if (body && body.messages && body.messages.length === 0) {
				logger.log('info', `boxId: ${boxid}: getRoomMessages: ${roomType}: ${username}: ${roomId} No Messages Found`);
 				resolve ([]); 			
 			}
 			else {
				logger.log('error', `boxId: ${boxid}: getRoomMessages: ${roomType}: ${username}: ${roomId} ERROR: ${JSON.stringify(body)}`);
 				resolve ([]);
 			}
		});
	});
    let result = await promise;
    return result;
}

function data() {
	return data;
}

async function getUserListForBox(boxid) {
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users.ADMIN.keys.userId,
				'X-Auth-Token': data.users.ADMIN.keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + `/api/v1/users.list?count=100&query={ "username": { "$regex": ".${boxid}" } }`
		}, function (err, res, body) {
			//logger.log('info', err,body);
			try {
				body = JSON.parse(body);
			}
			catch (err){
				console.log(`boxId: ${boxid}: getUserListForBox: Error: ${err}`);
				body = {};
			}
 			if (body && body.users) {
				var response = [];
				for (var user of body.users) {
					response.push(user.username);
				}
				logger.log('debug', `boxId: ${boxid}: getUserListForBox:  ${JSON.stringify(response)}`);
 				resolve (response);
 			}
 			else {
				logger.log('error', `boxId: ${boxid}: getUserListForBox: Invalid`);
 				resolve ([]);
 			}
		});
	});
    let result = await promise;
    return result;
}


function sortOnTimestamp(a, b) {
  let comparison = 0;
  if (a.ts > b.ts) {
    comparison = 1;
  } else if (a.ts < b.ts) {
    comparison = -1;
  }
  return comparison;
}

function convertEmojiTone(text) {
	if (text.includes ('_skin_tone:')) {
		text = text.replace(/_medium_light_skin_tone/g,'_tone2');
		text = text.replace(/_medium_skin_tone/g,'_tone3');
		text = text.replace(/_medium_dark_skin_tone/g,'_tone4');
		text = text.replace(/_dark_skin_tone/g,'_tone5');
		text = text.replace(/_light_skin_tone/g,'_tone1');
	}
	return (text);
}

function removePunctuation(string) {
	return(string.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").replace(/ /g,'_'))
}

module.exports = {
	init,
	data,
	getLogin,
	getUser,
	createUser,
	createChat,
	classChatGroup,
	findClassChatGroup,
	joinGroup,
	findGroup,
	getGroupDetails,
	sendMessage,
	sendMessageWithAttachment,
	getAttachment,
	prepareMessageSync
}