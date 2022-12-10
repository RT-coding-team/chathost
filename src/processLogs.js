const 

	moment = require('moment-timezone'),
    fs = require('fs'),
    mongo = require('./mongo.js'),
	assert = require('assert'),
	dbName = "chathost",	
	request = require('request'),
	mysql = require('mysql'),
	os = require('os'),
	execSync = require('child_process').execSync;	


run()
async function run() {
	// First get content logs and summarize
	await sleep(2);
	var logs = await mongo.getLogsByType('content',0,moment().startOf('day').unix());
	console.log(logs);
}


async function sleep(duration) {
    let promise = new Promise((resolve, reject) => {
        console.log( 'sleep: ' + duration);
        setTimeout(function () {
            resolve(true);
        }, duration * 1000);
    });
    let result = await promise;
    return result;
};
