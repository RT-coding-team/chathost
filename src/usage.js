const
	{execSync}= require("child_process"),
    fs = require('fs');

var dictionary = execSync('cat ./functions.js |grep DICT:').toString();

var usageTexts = {get:'',del: '',post: '',put:'',set:'',do:''};
for (var row of dictionary.split('\n')) {
	row = row.replace('//DICT:','');
	//console.log(row);
	var values = row.split(':');
	usageTexts[values[0].toLowerCase()] += `			${values[1]}: ${values[2]}\n`;
}

var text =
`Usage: connectboxmanage <command> <key> <value>
	Commands:
		- del
		- get
		- post
		- put
		- set
		- do

		Values to del:
${usageTexts.del}
		Values to get:
${usageTexts.get}
		Values to post:
${usageTexts.post}
		Values to put:
${usageTexts.put}
		Values to set:
${usageTexts.set}
		Actions to do:
${usageTexts.do}

		Examples:
			connectboxmanage get hostname
			connectboxmanage get brand Image
			connectboxmanage do reboot
			connectboxmanage set hostname <new>
			connectboxmanage set brand Image=<wwwpath>
`;


module.exports = {
	text
}
