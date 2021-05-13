// Pull in the default config
var configs = {
	"logging":"console",
	"port":2820,
	"mongo": "mongodb://mongo:27017",
	"rocketchat": 'chathost.derekmaxson.com',
	"rocketchatadmin": "admin",
	"rocketchatpassword": "!1TheWell"
};

for (var env of Object.keys(process.env)) {
	if (env.includes('CHATHOST_')) {
		console.log(env);
		var key = env.replace('CHATHOST_','').toLowerCase();
		configs[key] = process.env[env];
	}
}
console.log(configs);

module.exports = configs;
