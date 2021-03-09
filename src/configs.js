// Pull in the default config
var configs = {
	"logging":"console",
	"port":2819
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
