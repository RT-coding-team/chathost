const configs = require('./configs.js'),
    Logger = require('./logger.js'),
    logger = new Logger(configs.logging),
	moment = require('moment-timezone'),
	    
	MongoClient = require('mongodb').MongoClient,
	assert = require('assert'),
	url = configs.mongo,
	dbName = "chathost";

var db;

console.log(url);
MongoClient.connect(url,{ useUnifiedTopology: true}, function(err, client) {
	assert.equal(null, err);
	console.log("Connected successfully to server");
	db = client.db(dbName);
});

// Returns the timestamp of the MOST RECENT MESSAGE RECEIVED FROM MOODLE
async function getMessageStatusValue(boxid) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('messagesInbound');
		collection.find({'boxid':boxid}).sort({_id:-1}).limit(1).toArray(function(err, result) {
			if (err) {
				resolve(null);
			}
			else {
				if (result && result[0] && result[0].timestamp) {
					resolve(result[0].timestamp.toString());			
				}
				else {
					resolve("0");
				}
			}
		});
	});
    let result = await promise;
    return result;
}

// Put the courseRoster in Mongo.  That is all
function setCourseRoster(boxid,body,callback) {
	const collection = db.collection('courseRoster');
	collection.updateOne({'_id':boxid.toString()},{ $set: {data: JSON.stringify(body),timestamp : moment().unix()}},{upsert:true}, function(err, result) {
		if (err) {
			callback(404);
		}
		else {
			callback(200);
		}
  	});
}

// Get all messages pending for a Moodle since timestamp (typically the value provided by getMessageStatusValue)
async function getMessagesOutbound(boxid,since) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('messagesOutbound');
		collection.find({boxid:boxid,timestamp:{$gt: parseInt(since)} }).toArray(function(err, results) {
			if (err) {
				resolve([]);
			}
			else {
				resolve(results);
			}
		});
	});
    let result = await promise;
    return result;
}

// Write a message to later be sent to Moodle
async function setMessageOutbound(boxid,record) {
    let promise = new Promise((resolve, reject) => {
		record.timestamp = moment().unix();
		record.boxid = boxid;
		const collection = db.collection('messagesOutbound');
		collection.insertOne(record, function(err, result) {
			if (err) {
				console.log(`setMessageOutbound: Error: ${err}`);
				resolve (false);
			}
			else {
				console.log(`setMessageOutbound: ${record._id}: Success`);
				resolve (true);
			}
		});
	});
    let result = await promise;
    return result;
}

// Write a message received from Moodle
function setMessagesInbound(boxid,body,callback) {
	const collection = db.collection('messagesInbound');
	for (var record of body) {
		record.timestamp = moment().unix();
		record.boxid = boxid;
		collection.insertOne(record, async function(err, result) {
			if (err) {
				console.log(`setMessagesInbound: Error: messageId: ${record.id}: ${err}`);
			}
			else {
				console.log(`setMessagesInbound: Success: messageId: ${record.id}:`);

///////////////////
// TODO: This is just testing auto-reply
var send = {
	recipient: {id:record.sender.id},
	sender: {id:record.recipient.id},
	message: `Received Message: ${record.message}`,
	conversation_id: record.conversation_id,
	subject: record.subject	
};
console.log(`Sending: Writing AutoResponder: ${send.message}`);
var sending = await setMessageOutbound(boxid,send);
//

			}
		});
	
	}
	callback(200);
}

// Get an attachment requested by Moodle
async function getAttachmentsOutbound(attachmentId) {
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
function setAttachmentsInbound(record,callback) {
	const collection = db.collection('attachments');
	record.timestamp = moment().unix();
	record._id = record.id;
	collection.insertOne(record, function(err, result) {
		if (err) {
			console.log(`setAttachmentsInbound: ${record.id}: Error: ${err}`);
		}
		else {
			console.log(`setAttachmentsInbound: ${record.id}: Success`);
		}
	});
	callback(200);
}


module.exports = {
	getMessageStatusValue,
	setMessageStatusValue,
	setCourseRoster,
	getMessagesOutbound,
	setMessagesInbound,
	getAttachmentsOutbound,
	setAttachmentsInbound
	
};
