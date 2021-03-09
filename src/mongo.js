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

async function getMessageStatusValue(boxid) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('messageStatus');
		collection.find({'_id':boxid}).toArray(function(err, result) {
			if (err) {
				resolve(null);
			}
			else {
				resolve(result[0].timestamp.toString());
			}
		});
	});
    let result = await promise;
    return result;
}

function setMessageStatusValue(boxid,callback) {
	const collection = db.collection('messageStatus');
	collection.updateOne({'_id':boxid.toString()},{ $set: {timestamp : moment().unix()}},{upsert:true}, function(err, result) {
		if (err) {
			callback(false);
		}
		else {
			callback(true);
		}
  	});
}

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

async function getMessagesOutbound(boxid) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('messagesOutbound');
		collection.find({'_id':boxid}).toArray(function(err, results) {
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

function setMessagesInbound(boxid,body,callback) {
	const collection = db.collection('messagesInbound');
	for (var record of body) {
		record.timestamp = moment().unix();
		collection.insertOne(record, function(err, result) {
			if (err) {
				console.log(`setMessagesInbound: ${record.id}: Error: ${err}`);
			}
			else {
				console.log(`setMessagesInbound: ${record.id}: Success`);
			}
		});
	
	}
	callback(200);
}


async function getAttachmentsOutbound(attachmentId) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('attachments');
		collection.find({'_id':attachmentId}).toArray(function(err, results) {
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

function setAttachmentsInbound(body,callback) {
	const collection = db.collection('attachments');
	for (var record of body) {
		record.timestamp = moment().unix();
		collection.insertOne(record, function(err, result) {
			if (err) {
				console.log(`setAttachmentsInbound: ${record.id}: Error: ${err}`);
			}
			else {
				console.log(`setAttachmentsInbound: ${record.id}: Success`);
			}
		});
	
	}
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
