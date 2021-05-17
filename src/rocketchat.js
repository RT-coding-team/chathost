const configs = require('./configs.js'),
    Logger = require('./logger.js'),
    logger = new Logger(configs.logging),
	moment = require('moment-timezone'),
	mongo = require('./mongo.js'),
	assert = require('assert'),
	url = configs.mongo,
	dbName = "chathost",
	request = require('request'),
	execSync = require('child_process').execSync;	

	var data = {
		users: {},
		channels: {}
	};

init();


async function init() {
	var serverAlive = await checkRocketChat();
	if (!serverAlive) {
		console.log(`FATAL`);
		process.exit(1);
	}
	if (!data.users.ADMIN) {
		await getAdmin();
		if (!data.users.ADMIN) {
			console.log(`FATAL`);
			process.exit(1);		
		}
	}
	if (process.argv[2] == 'test') {
		test();
	}
/////////////////////////////
// TODO: Sanity checks
// 	rocketChatClient.settings.get('FileUpload_ProtectFiles', function(err,body) {
// 		if (body && body.value !== false) {
// 			logger.log('error', `FileUpload_ProtectFiles must be false.  Message attachments will fail`);		
// 		}
// 	});
/////////////////////////////
}

async function test() {
	console.log(`Running Tests...`);

	var user = await getUser('derek');
	console.log(user);
//	var testUsername = 'user-' + moment().unix().toString();
	var testUsername = 'derek';
	await createUser({username:testUsername,email:`${testUsername}@email.com`,password:testUsername,name:testUsername,customFields:{wellId:1234}});

//console.log(testUsername);
//	await getUser(testUsername);
	console.log(data.users);

process.exit(1);

//var temp = await getMessages('mr-awesome.1234',1620670520);

//prepareMessageSync('1234',1620659751);
// 	var value = await mongo.getMessagesOutbound('1234',1620659750);
// 	console.log(value);
// 
// 	var value = await mongo.getMessagesOutbound('1234',1620659751);
// 	console.log(value);
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
				console.log(`checkRocketChat: ERROR: ${err}`);
				resolve (false);
			}
			else {
				if (body && body.includes('"success":true}')) {
					console.log(`checkRocketChat: Connected Successfully to Rocketchat`);
					resolve (true);
				}
				else {
					console.log(`checkRocketChat: ERROR: ${body}`);
					resolve (false);
				}
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
				console.log(`getAdmin: Successful Admin Connection`);
				resolve (true);
			}
			else {
				console.log(`getAdmin: ERROR: ${JSON.stringify(body)}`);
				resolve (false);
			}
		});
	});
    let result = await promise;
    return result;
}
 
async function createToken(username) {
console.log (data.users);
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
				console.log(`createToken: ${username}: ${JSON.stringify(body.data)}`)
				resolve (body.data);
			}
			else {
				console.log(`createToken: ${username}: ERROR: ${JSON.stringify(body)}`)
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}

async function getUser(username) {
	console.log(`getUser: ${username}`);
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users.ADMIN.keys.userId,
				'X-Auth-Token': data.users.ADMIN.keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + `/api/v1/users.info?username=${username}`,
			method: 'GET'
		}, async function (err, res, body) {
console.log(body);
			body = JSON.parse(body);
			if (body && body.user) {
				data.users[username] = body.user;
				data.users[username].keys = await createToken(username);
				data.users[username].chats = await getChats(username);
				resolve (data.users[username]);		
			}
			else {
				console.log(`getUser: A username '${username}' Not Found`);
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}


async function getChats(username) {
	console.log(`getChats: ${username}: Locating Chat Rooms`);
	if (!data.users[username]) {
		await getUser(username);
	}
	if (!data.users[username].keys) {
		await createToken(username);
	}
console.log(data.users[username],data.users[username].keys);
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
			body = JSON.parse(body);
			if (body && body.ims) {
				for (var im of body.ims) {
					for (var imUsername of im.usernames) {
						if (imUsername !== username) {
							response[imUsername] = im['_id'];
							console.log(`getChats: ${username} -> ${imUsername}: ${response[imUsername]}`);
						}
					}
				}
				data.users[username].chats = response;
				resolve (response);
			}
			else {
				console.log(`getChats: ${username}: ERROR: ${JSON.stringify(body)}`)
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}

async function createUser(user) {
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
			body = JSON.parse(body);
			if (body && body.user) {
				var username = user.username;
				data.users[username] = body.user;
				data.users[username].keys = await createToken(username);
				data.users[username].chats = await getChats(username);
				resolve (data.users[username]);		
			}
			else {
				console.log(`createUser: ${user.username} Failed: ${JSON.stringify(body)}`);
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}

async function createChat(people) {
	console.log(`createChat: ${people.join()}`);
    let promise = new Promise((resolve, reject) => {
		var postdata = {
			usernames:people.join()
		};
		console.log(JSON.stringify(postdata));
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
			body = JSON.parse(body);
 			if (body && body.room) {
				console.log(`createChat: ${people.join()}: roomId: ${body.room.rid}`);
 				resolve (true);
 			}
 			else {
				console.log(`createChat: ${people.join()}: FAILED`);
 				resolve (false);
 			}
		});
	});
    let result = await promise;
    return result;
}

async function sendMessage(fromUsername,toUsername,message,conversationId) {
	console.log(`sendMessage: ${fromUsername} -> ${toUsername}: Moodle conversationId: ${conversationId}: ${message}`);
	if (!data.users[fromUsername]) {
		await getUser(fromUsername);
	}
	if (!data.users[toUsername]) {
		await getUser(toUsername);
	}
	if (!data.users[fromUsername].chats || !data.users[fromUsername].chats[toUsername]) {
		await createChat([fromUsername,toUsername]);
		await getChats(fromUsername);
	}
	console.log(data.users[fromUsername]);
	mongo.setConversationId(conversationId,data.users[fromUsername].chats[toUsername]);  // record the moodle conversationId and Rocketchat roomId so that we can use these for sending messages to Moodle
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
				console.log(`sendMessage: ${fromUsername} -> ${toUsername}: ${message}: SUCCESS`);
 				resolve (true);
 			}
 			else {
				console.log(`sendMessage: ${fromUsername} -> ${toUsername}: ${message}: FAILED (${JSON.stringify(body)})`);
 				resolve (false);
 			}
		});
	});
    let result = await promise;
    return result;
}

//curl "https://chathost.derekmaxson.com/api/v1/rooms.upload/FFBYHK7q4MH3GDoZptizqhtTLKLg9rQvh7" -F file="@/tmp/sierrareplogosmall.png;type=image/png" -H "X-Auth-Token: 2ZLwN-HMp12MQDxfAFzXxmAH6VEGI_vr6x1gkPgBdzl" -H "X-User-Id: FFBYHK7q4MH3GDoZp"

async function sendMessageWithAttachment(fromUsername,toUsername,message) {
	console.log(`sendMessage: ${fromUsername} -> ${toUsername}: with attachment: ${data.length} bytes`);
console.log(data.users);
	if (!data.users[fromUsername]) {
		await getUser(fromUsername);
	}
	if (!data.users[toUsername]) {
		await getUser(toUsername);
	}
	if (!data.users[fromUsername].chats || data.users[fromUsername].chats[toUsername]) {
		await createChat([fromUsername,toUsername]);
		await getChats(fromUsername);
	}
	console.log(data.users[fromUsername]);
    let promise = new Promise((resolve, reject) => {
		var roomId = data.users[fromUsername].chats[toUsername];
		// Had to use curl because I could not determine how to pass the content type info in via request.js 
		var command = `curl -s "${configs.rocketchat}/api/v1/rooms.upload/${roomId}" -F file="@/tmp/${message.attachmentId};type=${message.mimetype}" -H "X-Auth-Token: ${data.users[fromUsername].keys.authToken}" -H "X-User-Id: ${data.users[fromUsername].keys.userId}"`
		var result = JSON.parse(execSync(command).toString());
		if (result.success === true) {
			resolve(true);
		}
		else {
			resolve(false);
		}
	});
    let result = await promise;
    return result;
}

async function prepareMessageSync(boxid,since) {
	// Discover all users on this boxid
	var users = await getUserListForBox(boxid);
	var messages = []
	for (var username of users) {
		console.log(`prepareMessageSync: ${boxid}: Checking User: ${username}`);
		messages = messages.concat(await getMessages(boxid,username,since));
	}
	mongo.messageSync(boxid,since,messages);
}

async function getMessages(boxid,username,since) {
	console.log(`getMessages: ${username}`);
	if (!data.users[username]) {
		await getUser(username);
	}	
	if (!data.users[username].keys) {
		await createToken(username);
	}
	if (!data.users[username].chats) {
		await getChats(username);
	}
	var response = [];
	for (var roomId of Object.values(data.users[username].chats)) {
		console.log(`getMessages: ${username}: ${roomId}`);
		var messages = await getRoomMessages(boxid,username,roomId,since);
		response = response.concat(messages);
	}
	return (response);
}

async function getRoomMessages(boxid,username,roomId,since) {
	console.log(`getRoomMessages: ${username}: ${roomId}: Since ${moment(since*1000).format()}`);
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users[username].keys.userId,
				'X-Auth-Token': data.users[username].keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + `/api/v1/im.history?roomId=${roomId}&count=100`//`&oldest=${moment(since*1000).format()}`
		}, async function (err, res, body) {
			body = JSON.parse(body);
			var response = [];
 			if (body && body.messages && body.messages.length > 0) {
				var messages = body.messages.sort(sortOnTimestamp);	
				for (var message of messages) {
					if (message.u.username === username) {
						console.log(`getRoomMessages: Skipping self-sent message: ${message._id}`);
						continue;
					}
					console.log(message);
//					process.exit(1);
					var conversationId = await mongo.getConversationId(message.rid);
					var moodleMessage = {
						id: message._id,
						"conversation_id": conversationId,
						subject: null,
						message: message.msg,
						sender: {
							username: message.u.username,  // Sender should always be a "teacher" or admin on Rocketchat
							id: await mongo.getTeacherSenderId(boxid,message.u.username)
						},
						recipient: {
							username: username.substr(0, username.lastIndexOf("."))   // Recipient should always been on the Moodle box.
						},
						"created_on": moment(message.ts).unix()				
					}
					if (message.attachments) {
						moodleMessage.message = `<attachment type="${message.attachments[0].image_type.split('/')[0]}" id="${message.attachments[0].image_url}">`;
					}
					response.push(moodleMessage);
				}	
				
				console.log(`getRoomMessages: ${username}: ${roomId} ${response.length}`);
 				resolve (response);
 			}
 			else {
				console.log(`getRoomMessages: ${username}: ${roomId} ERROR`);
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
			uri: configs.rocketchat + `/api/v1/users.list?count=100&query={ "username": { "$regex": ".1234" } }`
		}, function (err, res, body) {
			//console.log(err,body);
			body = JSON.parse(body);
 			if (body && body.users) {
				var response = [];
				for (var user of body.users) {
					response.push(user.username);
				}
				console.log(`getUserListForBox: ${boxid}: ${JSON.stringify(response)}`);
 				resolve (response);
 			}
 			else {
				console.log(`getUserListForBox: ${boxid}: Invalid`);
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


module.exports = {
	init,
	data,
	getUser,
	createUser,
	createChat,
	sendMessage,
	sendMessageWithAttachment,
	prepareMessageSync
}