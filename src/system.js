const 

	moment = require('moment-timezone'),
    fs = require('fs'),
	MongoClient = require('mongodb').MongoClient,
	assert = require('assert'),
	dbName = "chathost",	
	request = require('request'),
	mysql = require('mysql'),
	os = require('os'),
	execSync = require('child_process').execSync;	


run();

async function run() {
	var results = {};
 	results.docker = await checkDocker();
 	results.chathost = await checkURL('http://localhost:2820/chathost/healthCheck');
 	results.bolt = await checkURL('http://localhost:8080');
 	results.mongo = await checkMongo();
	results.cpu = await getCPU() + '%';
	results.memory = await getMEM() + '%';
	results.disk = await getDisk() + '%';
 	results.timestamp = moment().unix();
	console.log(results);
	fs.writeFileSync('/tmp/system.json',JSON.stringify(results));
	process.exit(0);
}


async function checkMongo() {
    let promise = new Promise((resolve, reject) => {
		MongoClient.connect('mongodb://localhost:27017/local?readPreference=primary&appname=MongoDB%20Compass&ssl=false',{ useUnifiedTopology: true}, function(err, client) {
			assert.equal(null, err);
			db = client.db(dbName);
			if (db && db.s && db.s.namespace) {
				resolve (true);
			}
			else {
				resolve (false);
			}
		});
	});
    let result = await promise;
    return result;
}

async function checkDocker() {
	var result = parseInt(execSync('docker ps |wc -l').toString()) - 1;
	if (result > 1) {
		return true;
	}
	else {
		return false;
	}
}

async function checkURL(url) {
    let promise = new Promise((resolve, reject) => {
		request({
			uri: url,
			method: 'GET'
		}, function (err, res, body) {
			if (err) {
				console.log(err);
				resolve (false);
			}
			else {
				if (res && res.statusCode < 400) {
					resolve (true);
				}
				else {
					resolve (false);
				}
			}
		});
	});
    let result = await promise;
    return result;
}

async function getCPU() {
	var response = 0;
	var procs = os.loadavg();
	for( proc in procs) {
		response += proc;
	}
	return Math.round(response / procs.length);
}

async function getMEM() {
	var memTotal = execSync('cat /proc/meminfo |grep MemTotal').toString().replace(/ +(?= )/g,'').split(' ')[1];
	var memAvailable = execSync('cat /proc/meminfo |grep MemAvailable').toString().replace(/ +(?= )/g,'').split(' ')[1];
	console.log(memTotal,memAvailable);
	return Math.round((memTotal - memAvailable) / memTotal * 100);
}

async function getDisk() {
	var disk = execSync('df -hT | grep /$').toString().split(' ')[0];
	var string = execSync(`df |grep ${disk}`).toString().replace(/\s+/g, ' ').trim();
	var fields = string.split(' ');
	return (parseInt(fields[4].replace('%','')));
}

