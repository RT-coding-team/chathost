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
MongoClient.connect(url, function(err, client) {
	assert.equal(null, err);
	console.log("Connected successfully to server");

	db = client.db(dbName);
	//client.close();
setMessageStatusValue(1234, function(result) {
	console.log(`Test: ${result}`);
});

});

async function getMessageStatusValue(boxid,callback) {
console.log("CHECK" + boxid + typeof(boxid));
    let promise = new Promise((resolve, reject) => {
		const collection = db.collection('messageStatus');
		collection.find({'_id':boxid}).toArray(function(err, result) {
	console.log(result[0].timestamp);
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

module.exports = {
	getMessageStatusValue,
	setMessageStatusValue
};
