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
 	results.rocketchat = await checkURL('http://localhost:3000');
 	results.chathost = await checkURL('http://localhost:2820/chathost/healthCheck');
 	results.moodle = await checkURL('http://localhost');
 	results.mongo = await checkMongo();
 	results.mariadb = await checkMariaDB();
	results.cpu = await getCPU() + '%';
	results.freeMemory = await getMEM() + '%';
	results.freeDisk = await getDisk() + '%';
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

async function checkMariaDB() {
    let promise = new Promise((resolve, reject) => {
		var connection = mysql.createConnection({
		  host     : 'localhost',
		  port     : 3306,
		  user     : 'root',
		  password : execSync('cat ~/chathost/docker-compose.yml | grep MYSQL_ROOT_PASSWORD=').toString().replace('      - MYSQL_ROOT_PASSWORD=','').replace('\n',''),
		  database : 'moodle'
		});
		connection.connect();
		connection.query('SELECT 1 + 1 AS solution', function (error, results, fields) {
			if (error) {
				resolve (false);
			};
			else {
				resolve (true);
			}
		});
		connection.end();
	});
    let result = await promise;
    return result;
}

async function checkURL(url) {
    let promise = new Promise((resolve, reject) => {
		request({
			uri: url,
			method: 'GET'
		}, function (err, res, body) {
			if (err) {
				resolve (false);
			}
			else {
				if (res && res.statusCode === 200) {
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
	console.log(os.freemem(),os.totalmem())
	return Math.round(os.freemem() / os.totalmem() * 100);
}

async function getDisk() {
	var string = execSync('df |grep /dev/nvme0n1p1').toString().replace(/\s+/g, ' ').trim();
	var fields = string.split(' ');
	return (100 - parseInt(fields[4].replace('%','')));
}

