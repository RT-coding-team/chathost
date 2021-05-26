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
		channels: {}
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
	prepareMessageSync('5aadd2d0235c4fefa3260a4a4e0b92b6',1620659751);
}

async function Atest() {
	logger.log('info', `Running Tests...`);

	//await setSetting('')

process.exit(1);
	var user = await getUser('derek');
	logger.log('info', user);
//	var testUsername = 'user-' + moment().unix().toString();
	var testUsername = 'derek';
	await createUser({username:testUsername,email:`${testUsername}@email.com`,password:testUsername,name:testUsername,customFields:{wellId:1234}});

//logger.log('info', testUsername);
//	await getUser(testUsername);
	logger.log('info', data.users);

process.exit(1);

//var temp = await getMessages('mr-awesome.1234',1620670520);

//prepareMessageSync('1234',1620659751);
// 	var value = await mongo.getMessagesOutbound('1234',1620659750);
// 	logger.log('info', value);
// 
// 	var value = await mongo.getMessagesOutbound('1234',1620659751);
// 	logger.log('info', value);
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
 
async function getToken(username) {
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
				logger.log('debug', `getToken: ${username}: ${JSON.stringify(body.data)}`)
				resolve (body.data);
			}
			else {
				logger.log('error', `getToken: ${username}: ERROR: ${JSON.stringify(body)}`)
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}

async function getUser(username) {
	logger.log('info', `getUser: ${username}`);
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
			body = JSON.parse(body);
			if (body && body.user) {
				logger.log('debug', `getUser: ${username} Cached`);
				data.users[username] = body.user;
				data.users[username].keys = await getToken(username);
				data.users[username].chats = await getChats(username);
				resolve (data.users[username]);		
			}
			else {
				logger.log('error', `getUser: A username '${username}' Not Found`);
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}


async function getChats(username) {
	logger.log('info', `getChats: ${username}: Locating Chat Rooms`);
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
			body = JSON.parse(body);
			if (body && body.ims) {
				for (var im of body.ims) {
					for (var imUsername of im.usernames) {
						if (imUsername !== username) {
							response[imUsername] = im['_id'];
							//logger.log('info', `getChats: ${username} -> ${imUsername}: ${response[imUsername]}`);
						}
					}
				}
				data.users[username].chats = response;
				logger.log('debug', `getChats: ${username} Found ${Object.keys(data.users[username].chats).length} chats`);
				resolve (response);
			}
			else {
				logger.log('error', `getChats: ${username}: ERROR: ${JSON.stringify(body)}`)
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}

async function createUser(user) {
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
			body = JSON.parse(body);
			if (body && body.user) {
				var username = user.username;
				data.users[username] = body.user;
				data.users[username].keys = await getToken(username);
				data.users[username].chats = await getChats(username);
				logger.log('debug', `createUser: ${user.username} Successful`);
				resolve (data.users[username]);		
			}
			else {
				logger.log('error', `createUser: ${user.username} Failed: ${JSON.stringify(body)}`);
				resolve ({});
			}
		});
	});
    let result = await promise;
    return result;
}

async function createChat(people) {
	logger.log('debug', `createChat: ${people.join()}`);
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
			body = JSON.parse(body);
 			if (body && body.room) {
				logger.log('debug', `createChat: ${people.join()}: roomId: ${body.room.rid}`);
 				resolve (true);
 			}
 			else {
				logger.log('error', `createChat: ${people.join()}: FAILED`);
 				resolve (false);
 			}
		});
	});
    let result = await promise;
    return result;
}

async function sendMessage(fromUsername,toUsername,message) {
	logger.log('info', `sendMessage: ${fromUsername} -> ${toUsername}: ${message}`);
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
				logger.log('debug', `sendMessage: ${fromUsername} -> ${toUsername}: ${message}: SUCCESS`);
 				resolve (true);
 			}
 			else {
				logger.log('error', `sendMessage: ${fromUsername} -> ${toUsername}: ${message}: FAILED (${JSON.stringify(body)})`);
 				resolve (false);
 			}
		});
	});
    let result = await promise;
    return result;
}

//curl "https://chathost.derekmaxson.com/api/v1/rooms.upload/FFBYHK7q4MH3GDoZptizqhtTLKLg9rQvh7" -F file="@/tmp/sierrareplogosmall.png;type=image/png" -H "X-Auth-Token: 2ZLwN-HMp12MQDxfAFzXxmAH6VEGI_vr6x1gkPgBdzl" -H "X-User-Id: FFBYHK7q4MH3GDoZp"

async function sendMessageWithAttachment(fromUsername,toUsername,message) {
	logger.log('info', `sendMessageWithAttachment: ${fromUsername} -> ${toUsername}: with attachment: ${message.id}`);
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
	var roomId = data.users[fromUsername].chats[toUsername];
	if (!roomId) {
		logger.log('error', `sendMessageWithAttachment: ${fromUsername} -> ${toUsername}: No valid chat room for that conversation`);
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
			logger.log('error', `sendMessageWithAttachment: FAILED: ${err}`);
			sendMessage(fromUsername,toUsername,`The attachment ${message.filename} has failed to be delievered`);
			sendMessage(toUsername,fromUsername,`The attachment ${message.filename} has failed to be delievered`);
			resolve (false);
		}
	});
    let result = await promise;
    return result;
}

async function getAttachment(path) {
    let promise = new Promise((resolve, reject) => {
    	logger.log('info', `getAttachment: ${configs.rocketchat}${path}`);
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
		logger.log('debug', `prepareMessageSync: ${boxid}: Checking User: ${username}`);
		messages = messages.concat(await getMessages(boxid,username,since));
	}
	mongo.messageSync(boxid,since,messages);
}

async function getMessages(boxid,username,since) {
	logger.log('info', `getMessages: ${username}`);
	if (!data.users[username]) {
		await getUser(username);
	}	
	if (!data.users[username].keys) {
		await getToken(username);
	}
	if (!data.users[username].chats) {
		await getChats(username);
	}
	var response = [];
	for (var roomId of Object.values(data.users[username].chats)) {
		logger.log('info', `getMessages: ${username}: ${roomId}`);
		var messages = await getRoomMessages(boxid,username,roomId,since);
		response = response.concat(messages);
	}
	mongo.setMessageStatusValue(boxid);
	return (response);
}

async function getRoomMessages(boxid,username,roomId,since) {
	logger.log('debug', `getRoomMessages: ${username}: ${roomId}: Since ${moment(since*1000).format()}`);
    let promise = new Promise((resolve, reject) => {
		request({
			headers: {
				'X-User-Id': data.users[username].keys.userId,
				'X-Auth-Token': data.users[username].keys.authToken,
				'Content-Type': 'application/json'
			},
			uri: configs.rocketchat + `/api/v1/im.history?roomId=${roomId}&count=100&oldest=${moment(since*1000).tz('America/Los_Angeles').format()}`
		}, async function (err, res, body) {
			body = JSON.parse(body);
			var response = [];
 			if (body && body.messages && body.messages.length > 0) {
				logger.log('debug', `getRoomMessages: ${username}: ${roomId}: Found ${body.messages.length} messages`);
				var messages = body.messages.sort(sortOnTimestamp);	
				for (var message of messages) {
					logger.log('debug', `getRoomMessages: ${username}: ${roomId}: Checking Message: ${message._id}: ${message.u.username}`);
					if (message.u.username === username) {
						logger.log('debug', `getRoomMessages: ${username}: ${roomId}: Skipping self-sent message: ${message._id}`);
					}
					else {
						logger.log('info', message);
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
						if (message.attachments) {
							var type = message.file.type.split('/')[0];
							if (type === 'image') {
								type = 'photo';
							}
							else if (type !== 'video' && type !== 'audio') {
								type = 'document';
							}
							moodleMessage.message = `<attachment type="${type}" id="${moment(message.ts).valueOf()}" filename="${message.file.name}" filepath="${message.attachments[0].title_link}">`;
						}
						logger.log('debug', `getRoomMessages: ${username}: ${roomId}: Sending message: ${message._id} from ${message.u.username}: ${moodleMessage.message}`);
						response.push(moodleMessage);
					}
				}	
				
				logger.log('info', `getRoomMessages: ${username}: ${roomId}: Sending ${response.length} messages`);
 				resolve (response);
 			}
 			else if (body && body.messages && body.messages.length === 0) {
				logger.log('info', `getRoomMessages: ${username}: ${roomId} No Messages Found`);
 				resolve ([]); 			
 			}
 			else {
				logger.log('error', `getRoomMessages: ${username}: ${roomId} ERROR: ${JSON.stringify(body)}`);
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
			body = JSON.parse(body);
 			if (body && body.users) {
				var response = [];
				for (var user of body.users) {
					response.push(user.username);
				}
				logger.log('debug', `getUserListForBox: ${boxid}: ${JSON.stringify(response)}`);
 				resolve (response);
 			}
 			else {
				logger.log('error', `getUserListForBox: ${boxid}: Invalid`);
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


module.exports = {
	init,
	data,
	getUser,
	createUser,
	createChat,
	sendMessage,
	sendMessageWithAttachment,
	getAttachment,
	prepareMessageSync
}