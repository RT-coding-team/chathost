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
var settingsPending = {};

MongoClient.connect(configs.mongo,{ useUnifiedTopology: true}, async function(err, client) {
	assert.equal(null, err);
	logger.log('info', `mongoClientConnect: Connected Successfully to MongoDB: ${configs.mongo}`);
	db = client.db(dbName);
	setUpMongo();
});

async function checkAPIKeys(boxid,authorization) {
	if (authorization) {
		authorization = authorization.replace('Bearer ','').replace('Bearer','');
	}
	//logger.log('info', `checkAPIKeys: boxid: ${boxid} -- Token: ${authorization}`);
    let promise = new Promise((resolve, reject) => {
		if (!authorization) {
			return resolve (false);
		}
		const collection = db.collection('security');
		if (!authorization || authorization.length < 5) {
			//logger.log('error', `checkAPIKeys: Invalid Authorization Token Format`);
			return resolve(false);
		}
		collection.find({boxid:boxid,authorization:authorization }).toArray(function(err, results) {
			if (results && results[0]) {
				//logger.log('debug', `checkAPIKeys: Existing Device Authorized For Sync: ${results[0].boxid}`);
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
						//logger.log('debug', `checkAPIKeys: New Device. ${boxid} Setting Up Default Security: New Key: ${authorization}`);
						collection.insertOne({boxid:boxid,authorization:authorization,deleteOthers:true,timestamp: moment().unix() + 10}, function(err, result) {
							resolve(true);			
						});	
					}
					else {
						//logger.log('error', `checkAPIKeys: Invalid Security`);
						resolve(false);
					}
				});			
			}
			else {
				//logger.log('error', `checkAPIKeys: No Valid Credentials`);
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
	logger.log('info', `boxId: ${boxid}: getMessageStatusValue: Box: ${boxid}`);
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('boxSyncTime');
		collection.find({'boxid':boxid }).toArray(function(err, results) {
			if (!results || !results[0]) {
				logger.log('debug', `boxId: ${boxid}: getMessageStatusValue: No Prior Sync.  Get All Messages`);
				resolve('1');
			}
			else {
				logger.log('debug', `boxId: ${boxid}: getMessageStatusValue: Get All Messages Newer Than: ${results[0].timestamp}`);
				resolve(results[0].timestamp.toString());
			}
		});
	});
    let result = await promise;
    return result;
}

function unauthorizedBoxes(string) {
	var [boxid,key] = string.replace('Bearer ','').split('|');
	logger.log('debug',`unauthorizedBoxes: ${boxid}: ${string}`);
	setCourseRoster(boxid,[{sitename:'UNAUTHORIZED'}],'', function(response) {
		// Nothing to do here;
	});
}

// Put the courseRoster in Mongo.  That is all
function setCourseRoster(boxid,body,ip,callback) {
	const collection = db.collection('courseRoster');
	if (body && body[0] && body[0].authorization) {
		body[0].authorization = body[0].authorization.replace('Bearer ','');
		if (body[0].sitename) {
			body[0].siteip = ip;
		}
	}
	collection.updateOne({'_id':boxid.toString()},{ $set: {data: body,timestamp : moment().unix()}},{upsert:true}, function(err, result) {
		if (err) {
			logger.log('error', `boxId: ${boxid}: setCourseRoster: FAILED: ${err}`);
			callback(500);
		}
		else {
			logger.log('info', `boxId: ${boxid}: setCourseRoster: Success`);
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
				results[0].data[0].timestamp = results[0].timestamp;
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
function setLogs(boxid,data,type,callback) {
	try {
		const collection = db.collection('logs');
		for (var log of data) {
			log.boxid = boxid;
			log.type = type;
		}
		collection.insertMany(data, function(err, result) {
			if (err) {
				logger.log('error', `boxId: ${boxid}: setLogs: ${type} FAILED: ${err}`);
				callback(500);
			}
			else {
				logger.log('info', `boxId: ${boxid}: setLogs: ${type}: Success`);
				callback(200);
			}
		});
	}
	catch (err) {
		console.log(err);
		logger.log('error', `boxId: ${boxid}: setLogs: FAILED: ${err}`);
		callback (500);
	}
}

// Removes the zip data here
function replacer(key,value)
{
    if (key=="zip") return undefined;
    else return value;
}

// Get all messages pending for a Moodle since timestamp (typically the value provided by getMessageStatusValue)
async function getMessageSync(boxid,since) {
	logger.log('info', `boxId: ${boxid}: getMessageSync: Box: ${boxid} since ${since}`);
	var boxidSince = `${boxid}-${since}`;
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('messageSync');
		collection.find({'_id': boxidSince }).toArray(function(err, results) {
			if (err) {
				logger.log('error', `boxId: ${boxid}: getMessageSync: FAILED: ${err}`);
				resolve(500);
			}
			else if (results && results[0] && results[0].messages) {
				collection.deleteOne({ _id: `${boxid}-${since}` }, function(err, result) {});
				logger.log('info', `boxId: ${boxid}: getMessageSync: Successfully retrieved sync with ${results[0].messages.length} messages`);
				resolve(results[0].messages);
			}
			else {
				logger.log('info', `boxId: ${boxid}: getMessageSync: No messages`);	
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
			logger.log('error', `boxId: ${boxid}: messageSync: Error: boxid: ${boxid}: ${err}`);
		}
		else {
			logger.log('info', `boxId: ${boxid}: messageSync: ${boxid}: Sync prepared for ${timestamp}: ${messages.length} Messages`);
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
			logger.log('error', `boxId: ${boxid}: messageDone: Error: messageId: ${id}: ${err}`);
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

async function searchLogs(querystring) {
    let promise = new Promise((resolve, reject) => {
    	console.log('1');
		const collection = db.collection('logs');
		console.log(querystring);
		collection.find(querystring).toArray(function(err, response) {
			resolve(response);
		});
	});
    let result = await promise;
    return result;
}

async function getLogs(boxid) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('logs');
		collection.find({boxid:boxid}).toArray(function(err, response) {
			resolve(response);
		});
	});
    let result = await promise;
    return result;
}

function orderLogs( a, b ) {
  if ( a.timestamp < b.timestamp ){
    return -1;
  }
  if ( a.timestamp > b.timestamp ){
    return 1;
  }
  return 0;
}

async function getSettings(boxid,sendPending) {
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('settings');
		collection.find({boxid:boxid}).toArray(function(err, results) {
			if (results && results[0]) {
				var response = [];
				for (var result of results) {
					if (sendPending || !settingsPending[result.deleteId] || settingsPending[result.deleteId] > moment.unix()) {
						result.pending = "No";
						if (!sendPending) {
							settingsPending[result.deleteId] = moment('21000101','YYYYMMDD').unix();  // Don't send it until the next century. :)
						}
						if (settingsPending[result.deleteId]) {
							result.pending = "Yes";						
						}
						logger.log('info', `boxId: ${boxid}: getSettings: Sending ${result.key}.  Pending until ${settingsPending[result.deleteId]} (${moment(settingsPending[result.deleteId] * 1000).format('LLL')})`);			
						response.push(result);
					}
					else {
						logger.log('info', `boxId: ${boxid}: getSettings: Not Resending ${result.key} until ${moment(settingsPending[result.deleteId] * 1000).format('LLL')}`);			
					}
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
			logger.log('error', `boxId: ${boxid}: putSetting: Error: ${boxid}: ${key}: ${err}`);
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
				logger.log('error', `boxId: ${boxid}: deleteSetting: Error: ${boxid}: ${recordid}: ${err}`);
				resolve (false);
			}
			else if (result.deletedCount === 0) {
				logger.log('error', `boxId: ${boxid}: deleteSetting: Error: ${boxid}: ${recordid}: Object Not Found`);		
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
		console.log(`boxId: ${boxid}: putSecurity: ${boxid}: keyReset: true`);
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
			logger.log('error', `boxId: ${boxid}: putSetting: Error: ${boxid}: ${key}: ${err}`);
		}
		else {
		}
	});
}

function deleteCourseRoster(boxid) {
	const collection = db.collection('courseRoster');
	console.log(`deleteCourseRoser: ${boxid}`);
	collection.deleteMany({"_id": boxid}, function(err,result) {
		// Delete all keys that exist currently
		//console.log (err,result);
	}); 
}

function deleteSecurity(boxid) {
	const collection = db.collection('security');
	console.log(`deleteSecurity: ${boxid}`);
	collection.deleteMany({"boxid": boxid}, function(err,result) {
		// Delete all keys that exist currently
		//console.log (err,result);
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
	unauthorizedBoxes,
	getBoxRosters,
	messageSentToRocketChat,
	isMessageSentToRocketChat,
	messageSync,
	getMessageSync,
	getAttachmentExists,
	setAttachmentsInbound,
	setLogs,
	searchLogs,
	getLogs,
	getSettings,
	putSetting,
	deleteSetting,
	getSecurity,
	putSecurity,
	deleteSecurity,
	deleteCourseRoster,
	getBoxInventory,
	status
};
