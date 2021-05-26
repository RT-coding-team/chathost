const configs = require('./configs.js'),
    Logger = require('./logger.js'),
    logger = new Logger(configs.logging),
	moment = require('moment-timezone'),
    fs = require('fs'),
	FileType = require('file-type'),
  
	MongoClient = require('mongodb').MongoClient,
	assert = require('assert'),
	url = configs.mongo,
	dbName = "chathost";

var db;

console.log(url);
MongoClient.connect(url,{ useUnifiedTopology: true}, function(err, client) {
	assert.equal(null, err);
	console.log(`mongoClientConnect: Connected Successfully to MongoDB`);
	db = client.db(dbName);
	setUpMongo();
});

function setMessageStatusValue(boxid,username,id) {
	const collection = db.collection('boxSyncTime');
	collection.updateOne({boxid:boxid},{ $set: {timestamp: moment().unix()}},{upsert:true}, function(err, result) {
  	});	
}

async function getMessageStatusValue(boxid) {
	console.log(`getMessageStatusValue: Box: ${boxid}`);
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('boxSyncTime');
		collection.find({'boxid':boxid }).toArray(function(err, results) {
			if (!results || !results[0]) {
				resolve('1');
			}
			else {
				console.log(`getMessageStatusValue: Get All Messages Newer Than: ${results[0].timestamp}`);
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
			callback(404);
		}
		else {
			callback(200);
		}
  	});
}

// Put the logs in Mongo.  That is all
function setLogs(boxid,body,callback) {
	const collection = db.collection('logs');
	collection.insertOne({'boxid':boxid.toString(),data: JSON.stringify(body),timestamp : moment().unix()}, function(err, result) {
		if (err) {
			callback(404);
		}
		else {
			callback(200);
		}
  	});
}

// Get all messages pending for a Moodle since timestamp (typically the value provided by getMessageStatusValue)
async function getMessageSync(boxid,since) {
	console.log(`getMessageSync: Box: ${boxid} since ${since}`);
	var boxidSince = `${boxid}-${since}`;
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('messageSync');
		collection.find({'_id': boxidSince }).toArray(function(err, results) {
			if (err) {
				resolve(500);
			}
			else if (results && results[0] && results[0].messages) {
				collection.deleteOne({ _id: `${boxid}-${since}` }, function(err, result) {});
				resolve(results[0].messages);
			}
			else {
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
			console.log(`messageSync: Error: boxid: ${boxid}: ${err}`);
		}
		else {
			console.log(`messageSync: ${boxid}: Sync prepared for ${timestamp}: ${messages.length} Messages`);
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
			console.log(`messageDone: Error: messageId: ${id}: ${err}`);
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


// Get an attachment requested by Moodle
async function getAttachment(attachmentId) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('attachments');
		collection.find({'_id':attachmentId}).toArray(function(err, results) {
			if (results[0] && results[0].mimetype) {
				resolve({response:200,mimetype: results[0].mimetype,file:Buffer.from(results[0].file.buffer, 'base64')});
			}
			else {
				resolve({response:404,mimetype: null,file:null});
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
			console.log(`setAttachmentsInbound: ${record.idWithBoxid}: Already Exists.  Not Updating`);			
			callback (200);
		}
		else if (err) {
			console.log(`setAttachmentsInbound: ${record.idWithBoxid}: Error: ${err}`);
			callback(500);
		}
		else {
			var upload = fs.writeFileSync(`/tmp/${record.idWithBoxid}`,file,{encoding: "base64"});
			if (fs.existsSync(`/tmp/${record.idWithBoxid}`)) {
				collection.updateOne({ _id: record.idWithBoxid},{ $set: {uploaded: true}},{upsert:true});	
				db.collection('attachmentsFailed').deleteOne({ _id: record.idWithBoxid});	
				console.log(`setAttachmentsInbound: ${record.idWithBoxid}: Success`);
				callback (200);
			}
			else {
				collection.deleteOne({ _id: record.idWithBoxid});	
				db.collection('attachmentsFailed').updateOne({ _id: record.idWithBoxid},{ $set: {attachmentId: record.id,boxid:record.boxid,uploaded: false}},{upsert:true});	
				console.log(`setAttachmentsInbound: ${record.idWithBoxid}: ERROR`);
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

// Get all attachmentIds for attachments that didn't make it
async function findMissingAttachmentsInbound(boxid) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('attachmentsFailed');
		collection.find({'boxid':boxid}).toArray(function(err, results) {
			if (err) {
				resolve([]);
			}
			else {
				var finalResults = [];
				for (var result of results) {
					finalResults.push(result.attachmentId);
				}
				var unique = [...new Set(finalResults)];
				resolve(unique);
			}
		});
	});
    let result = await promise;
    return result;
}

function setUpMongo() {
	db.collection('logs').createIndex( { "createdAt": 1 }, { expireAfterSeconds: 30 } );
	console.log(`setUpMongo: Done`);
}

function removeOldRecords() {
	var oneMonthAgo = moment().add(-30, 'days').unix();
	var oneMonthAgo = moment().add(-1, 'days').unix();
	db.collection('logs').deleteMany({timestamp: {$lt: oneMonthAgo}});
	db.collection('messageSync').deleteMany({timestamp: {$lt: oneDayAgo}});
}

module.exports = {
	getMessageStatusValue,
	setMessageStatusValue,
	setCourseRoster,
	messageSentToRocketChat,
	isMessageSentToRocketChat,
	messageSync,
	getMessageSync,
	getAttachment,
	getAttachmentExists,
	setAttachmentsInbound,
	findMissingAttachmentsInbound,
	setLogs
};
