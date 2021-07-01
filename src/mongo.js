const configs = require('./configs.js'),
    Logger = require('./logger.js'),
    logger = new Logger(configs.logging),
	moment = require('moment-timezone'),
    fs = require('fs'),
	FileType = require('file-type'),
  	{ v4: uuidv4 } = require('uuid'),
  
	MongoClient = require('mongodb').MongoClient,
	assert = require('assert'),
	dbName = "chathost";

var db;

MongoClient.connect(configs.mongo,{ useUnifiedTopology: true}, async function(err, client) {
	assert.equal(null, err);
	logger.log('info', `mongoClientConnect: Connected Successfully to MongoDB: ${configs.mongo}`);
	db = client.db(dbName);
	setUpMongo();
});

async function checkAPIKeys(boxid,authorization) {
	if (authorization) {
		authorization = authorization.replace('Bearer ','');
	}
	logger.log('info', `checkAPIKeys: Token: ${authorization}`);
    let promise = new Promise((resolve, reject) => {
		if (!authorization) {
			resolve (false);
		}
		const collection = db.collection('security');
		if (!authorization || authorization.length < 5) {
			logger.log('error', `checkAPIKeys: Invalid Authorization Token Format`);
			resolve(false);
		}
		collection.find({'authorization':authorization }).toArray(function(err, results) {
			if (results && results[0]) {
				logger.log('debug', `checkAPIKeys: Existing Device Authorized For Sync`);
				if (results[0].deleteOthers) {
					// todo
				}
				resolve (results[0].boxid);
			}
			else if (boxid && boxid.length > 5) {
				// If no authorization, it may be new box and we'll do auto-add
				collection.find({'boxid':boxid }).toArray(function(err, results) {
					if (!results || !results[0]) {
						collection.insertOne({boxid:boxid,authorization:authorization, timestamp: moment().unix()});	
						// If the authorization is empty or short, create a GUID and send to the box
						if (authorization.length < 8) {
							authorization = uuidv4();
							putSetting(boxid,"authorization",authorization);
						}
						logger.log('debug', `checkAPIKeys: New Device.  Setting Up Default Security: New Key: ${authorization}`);
						collection.insertOne({boxid:boxid,authorization:authorization,deleteOthers:true,timestamp: moment().unix() + 10}, function(err, result) {
							resolve(true);			
						});	
					}
					else {
						logger.log('error', `checkAPIKeys: Invalid Security`);
						resolve(false);
					}
				});			
			}
			else {
				logger.log('error', `checkAPIKeys: No Valid Credentials`);
				resolve(false);
			}
		});
	});
    let result = await promise;
    return result;	
}

function setMessageStatusValue(boxid,username,id) {
	const collection = db.collection('boxSyncTime');
	collection.updateOne({boxid:boxid},{ $set: {timestamp: moment().unix()}},{upsert:true}, function(err, result) {
  	});	
}

async function getMessageStatusValue(boxid) {
	logger.log('info', `getMessageStatusValue: Box: ${boxid}`);
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('boxSyncTime');
		collection.find({'boxid':boxid }).toArray(function(err, results) {
			if (!results || !results[0]) {
				logger.log('debug', `getMessageStatusValue: No Prior Sync.  Get All Messages`);
				resolve('1');
			}
			else {
				logger.log('debug', `getMessageStatusValue: Get All Messages Newer Than: ${results[0].timestamp}`);
				resolve(results[0].timestamp.toString());
			}
		});
	});
    let result = await promise;
    return result;
}

// Put the courseRoster in Mongo.  That is all
function setCourseRoster(boxid,body,callback) {
	const collection = db.collection('courseRoster');
	collection.updateOne({'_id':boxid.toString()},{ $set: {data: body,timestamp : moment().unix()}},{upsert:true}, function(err, result) {
		if (err) {
			logger.log('error', `setCourseRoster: FAILED: ${err}`);
			callback(500);
		}
		else {
			logger.log('info', `setCourseRoster: Success`);
			callback(200);
		}
  	});
}

// Get the Roster
async function getBoxRosters(boxid) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('courseRoster');
		collection.find({'_id': boxid}).toArray(function(err, results) {
			if (results && results[0]) {
				resolve(results[0].data);
			}
			else {
				resolve([]);
			}
		});
	});
    let result = await promise;
    return result;	
}

// Put the logs in Mongo.  That is all
function setLogs(boxid,body,type,callback) {
	const collection = db.collection('logs');
	var id = `${boxid.toString()}-${type}`;
	collection.updateOne({ _id:id},{ $set: {'boxid':boxid.toString(),type:type,data: body,timestamp : moment().unix()}},{upsert:true}, function(err, result) {	
		if (err) {
			logger.log('error', `setLogs: FAILED: ${err}`);
			callback(500);
		}
		else {
			logger.log('info', `setLogs: Success`);
			callback(200);
		}
  	});
}

// Removes the zip data here
function replacer(key,value)
{
    if (key=="zip") return undefined;
    else return value;
}

// Get all messages pending for a Moodle since timestamp (typically the value provided by getMessageStatusValue)
async function getMessageSync(boxid,since) {
	logger.log('info', `getMessageSync: Box: ${boxid} since ${since}`);
	var boxidSince = `${boxid}-${since}`;
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('messageSync');
		collection.find({'_id': boxidSince }).toArray(function(err, results) {
			if (err) {
				logger.log('error', `setLogs: FAILED: ${err}`);
				resolve(500);
			}
			else if (results && results[0] && results[0].messages) {
				collection.deleteOne({ _id: `${boxid}-${since}` }, function(err, result) {});
				logger.log('info', `getMessageSync: Successfully retrieved sync with ${results[0].messages.length} messages`);
				resolve(results[0].messages);
			}
			else {
				logger.log('info', `getMessageSync: No messages`);	
				resolve(404);
			}
		});
	});
    let result = await promise;
    return result;
}

function messageSync(boxid,timestamp,messages) {
	const collection = db.collection('messageSync');
	var record = {
		_id: `${boxid}-${timestamp}`,
		boxid: boxid,
		messages: messages,
		timestamp: timestamp
	};
	collection.insertOne(record, function(err, result) {
		if (err) {
			logger.log('error', `messageSync: Error: boxid: ${boxid}: ${err}`);
		}
		else {
			logger.log('info', `messageSync: ${boxid}: Sync prepared for ${timestamp}: ${messages.length} Messages`);
		}
	});
}

// So we don't resend
function messageSentToRocketChat(boxid,id) {
	const collection = db.collection('messagesDone');
	var record = {
		_id: id,
		boxid: boxid,
		timestamp: moment().unix()
	};
	collection.insertOne(record, function(err, result) {
		if (err) {
			logger.log('error', `messageDone: Error: messageId: ${id}: ${err}`);
		}
		else {
		}
	});
}

// So we don't resend
async function isMessageSentToRocketChat(id) {
	const collection = db.collection('messagesDone');
    let promise = new Promise((resolve, reject) => {
		collection.find({'_id':id}).toArray(function(err, results) {
			if (results[0]) {
				resolve(true);
			}
			else {
				resolve(false);
			}
		});
	});
    let result = await promise;
    return result;
}

// Receive an attachment sent by Moodle
async function setAttachmentsInbound(record,file,callback) {
	const collection = db.collection('attachments');
	record.timestamp = moment().unix();
	record._id = record.idWithBoxid;
	var temp = await FileType.fromBuffer(file);
	record.mimetype = temp.mime;
	collection.insertOne(record, function(err, result) {
		if (err && err.code === 11000) {
			logger.log('info', `setAttachmentsInbound: ${record.idWithBoxid}: Already Exists.  Not Updating`);			
			callback (200);
		}
		else if (err) {
			logger.log('error', `setAttachmentsInbound: ${record.idWithBoxid}: Error: ${err}`);
			callback(500);
		}
		else {
			var upload = fs.writeFileSync(`/tmp/${record.idWithBoxid}`,file,{encoding: "base64"});
			if (fs.existsSync(`/tmp/${record.idWithBoxid}`)) {
				collection.updateOne({ _id: record.idWithBoxid},{ $set: {uploaded: true}},{upsert:true});	
				db.collection('attachmentsFailed').deleteOne({ _id: record.idWithBoxid});	
				logger.log('info', `setAttachmentsInbound: ${record.idWithBoxid}: Success`);
				callback (200);
			}
			else {
				collection.deleteOne({ _id: record.idWithBoxid});	
				db.collection('attachmentsFailed').updateOne({ _id: record.idWithBoxid},{ $set: {attachmentId: record.id,boxid:record.boxid,uploaded: false}},{upsert:true});	
				logger.log('error', `setAttachmentsInbound: ${record.idWithBoxid}: ERROR`);
				callback(500);
			}
		}
	});
}

// See if attachment exists
async function getAttachmentExists(id) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('attachments');
		collection.find({_id:id}).toArray(function(err, results) {
			if (results && results[0]) {
				results[0].response = 200;
				resolve(results[0]);
			}
			else {
				resolve({response:404});
			}
		});
	});
    let result = await promise;
    return result;
}

// See if attachment exists
async function getLogs(boxid) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('logs');
		collection.find({boxid:boxid}).toArray(function(err, results) {
			if (results && results[0]) {
				results[0].response = 200;
				resolve(results[0].data);
			}
			else {
				resolve({response:404});
			}
		});
	});
    let result = await promise;
    return result;
}

async function getSettings(boxid) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('settings');
		collection.find({boxid:boxid}).toArray(function(err, results) {
			if (results && results[0]) {
				resolve(results);
			}
			else {
				resolve([]);
			}
		});
	});
    let result = await promise;
    return result;
}

function putSetting(boxid,key,value) {
	const collection = db.collection('settings');
	var record = {
		boxid: boxid,
		deleteId: uuidv4(),
		timestamp: moment().unix(),
		key: key,
		value: value
	};
	collection.insertOne(record, function(err, result) {
		if (err) {
			logger.log('error', `putSetting: Error: ${boxid}: ${key}: ${err}`);
		}
		else {
		}
	});
}

async function deleteSetting(boxid,recordid) {
	const collection = db.collection('settings');
    let promise = new Promise((resolve, reject) => {
		collection.deleteOne({ deleteId: recordid }, function(err, result) {
			if (err) {
				logger.log('error', `deleteSetting: Error: ${boxid}: ${recordid}: ${err}`);
				resolve (false);
			}
			else if (result.deletedCount === 0) {
				logger.log('error', `deleteSetting: Error: ${boxid}: ${recordid}: Object Not Found`);		
				resolve (false);
			}
			else {
				resolve (true);
			}
		});
	});
    let result = await promise;
    return result;	
}

async function getSecurity(boxid) {
    let promise = new Promise((resolve, reject) => {
		var response = {};
		db.collection('courseRoster').find({_id:boxid}).toArray(function(err,results){
			if (results && results[0] && results[0].data && results[0].data[0] && results[0].data[0].authorization) {
				response.lastSecurityKey = results[0].data[0].authorization;
			}
			db.collection('security').find({boxid:boxid}).toArray(function(err, results) {
				if (results && results.length) {
					response.currentSecurityKey = results[results.length-1].authorization;
				}
				resolve(response);
			});
		});
	});
    let result = await promise;
    return result;
}

function putSecurity(boxid,authorization) {
	const collection = db.collection('security');
	if (authorization.includes('resetKey ')) {
		console.log(`putSecurity: ${boxid}: keyReset: true`);
		collection.deleteMany({"boxid": boxid}, function(err,result) {
			// Delete all keys that exist currently
			console.log (err,result);
		}); 
		authorization = authorization.replace('resetKey ',''); // Remove the resetKey value before writing to DB
	}
	else {
		// Write this new valid security setting for export to Well Box
		putSetting(boxid,'moodle-security-key',authorization);
	}
	var record = {
		boxid: boxid,
		timestamp: moment().unix(),
		authorization: authorization
	};
	collection.insertOne(record, function(err, result) {
		if (err) {
			logger.log('error', `putSetting: Error: ${boxid}: ${key}: ${err}`);
		}
		else {
		}
	});
}


async function getBoxInventory() {
	// Gets all boxes active in last 90 days
	var historyDate = moment().add(-90,'days').unix();
	var response = [];
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('courseRoster');
		collection.find({timestamp: {$gt: historyDate}}).toArray(function(err, results) {
			if (results) {
				for (var record of results) {
					response.push({boxid:record._id, timestamp:record.timestamp});
				}
				resolve(response);
			}
			else {
				resolve([]);
			}
		});
	});
    let result = await promise;
    return result;	
}

function setUpMongo() {
	logger.log('info', `setUpMongo: Done`);
}

function removeOldRecords() {
	var oneMonthAgo = moment().add(-30, 'days').unix();
	var oneMonthAgo = moment().add(-1, 'days').unix();
	db.collection('logs').deleteMany({timestamp: {$lt: oneMonthAgo}});
	db.collection('messageSync').deleteMany({timestamp: {$lt: oneDayAgo}});
}

function status() {
	if (db && db.s && db.s.id) {
		return true;
	}
	else {
		return false;
	}
}

module.exports = {
	checkAPIKeys,
	getMessageStatusValue,
	setMessageStatusValue,
	setCourseRoster,
	getBoxRosters,
	messageSentToRocketChat,
	isMessageSentToRocketChat,
	messageSync,
	getMessageSync,
	getAttachmentExists,
	setAttachmentsInbound,
	setLogs,
	getLogs,
	getSettings,
	putSetting,
	deleteSetting,
	getSecurity,
	putSecurity,
	getBoxInventory,
	status
};
