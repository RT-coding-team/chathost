const configs = require('./configs.js'),
    Logger = require('./logger.js'),
    logger = new Logger(configs.logging),
	moment = require('moment-timezone'),
    fs = require('fs'),
	FileType = require('file-type'),
  
	MongoClient = require('mongodb').MongoClient,
	assert = require('assert'),
	dbName = "chathost";

var db;

MongoClient.connect(configs.mongo,{ useUnifiedTopology: true}, function(err, client) {
	assert.equal(null, err);
	logger.log('info', `mongoClientConnect: Connected Successfully to MongoDB: ${configs.mongo}`);
	db = client.db(dbName);
	setUpMongo();
});

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
function setLogs(boxid,body,callback) {
	const collection = db.collection('logs');
	collection.insertOne({'boxid':boxid.toString(),data: JSON.stringify(body),timestamp : moment().unix()}, function(err, result) {
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
	getBoxInventory,
	status
};
