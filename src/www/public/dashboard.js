$(function() {

if (window.location.pathname === "/admin/login.html") {
}
else {
	console.log("authCheck");
	authCheck();
}

$("#hideWhenNoID1").hide();
$("#hideWhenNoID2").hide();
$("#hideWhenNoID3").hide();

var allData = {};


// LOADING REPORTS
    $.getJSON( "/api/state", function( data ) {
		data.email = {};
		data.email.all = '';
    	var instances = data.instances;
    	console.log(instances);
		for (var i=0; i < data.instances.length; i++) {
			data.instances[i].emailString = '';
			data.instances[i].installMessages = '';
			if (data.instances[i].emails) {
				for (var j=0; j<data.instances[i].emails.length; j++) {
					data.email.all = data.email.all + data.instances[i].emails[j] + ",";;
					data.instances[i].emailString = data.instances[i].emailString + data.instances[i].emails[j] + ",";
				}
			}

			if (data.instances[i].state.install && data.instances[i].state.install.messages) {
console.log(data.instances[i].state.install);
				for (var message of data.instances[i].state.install.messages) {
					data.instances[i].installMessages = data.instances[i].installMessages + message.text + "<BR>";
				
				}
			}
			if (data.instances[i].emailString) {
				data.instances[i].emailString = data.instances[i].emailString.slice(0,-1);
			}
			data.instances[i].link = `<a target="${data.instances[i].instance}" href="https://${data.instances[i].instance}.frontporch.cloud">${data.instances[i].instance}</a>&nbsp;&nbsp;&nbsp;<span data-toggle="modal" data-target="#detailModal" onclick="loadDetailModal('${data.instances[i].instance}')"><i class="icon info circle"</i></span>`;
			console.log(data.instances[i]);
			console.log(data.instances[i].state);
			console.log(data.instances[i].state.wifi);
			if (data.instances[i].state) {
				if (data.instances[i].state.wifi) {
					data.instances[i].wifis = Object.keys(data.instances[i].state.wifi).join(' ');
				}
				if (data.instances[i].state.destinations) {
					data.instances[i].dests = Object.keys(data.instances[i].state.destinations).join(' ');				
				}
			}
    	}
		data.email.all = data.email.all.slice(0,-1);
		$("#emailAll").attr("href", 'mailto:engage@frontporch.com?bcc=' + data.email.all);
    	console.log(data.email);
    	allData = JSON.parse(JSON.stringify(data));
		//drawTopChannels(data); 
		drawDevices(data); 
		if (data.instances[0].uptime) {
			$("#docker").html("Up");	
		}
		else {
			$("#docker").html("DOWN");	
		}
		$("#cpu").html(Math.round(data.metrics.cpu.Datapoints[0].Average)+"%");
		$("#mysql").html(data.mysql);
		$("#disk").html(data.metrics.disk+"%");
		$("#memory").html(data.metrics.memory+"%");
		$("#dockerStats").append(data.docker.ps);
		$("#dockerStats").append(data.docker.stats);
		$("#currentLocationsGrid").jsGrid({
			width: "100%",
 
			//inserting: true,
			//editing: true,

			filtering: true,
			autoload: true,
			sorting: true,
			//paging: true,

			controller: {
				data:instances,
				loadData: function(filter) {
					return $.grep(instances, function(item,i) {
						for (var key in filter) {
							var value = filter[key];
							if (value.length > 0) {
								if (item[key] && item[key].indexOf(value) == -1)
									return false;
							}
						}
						return true;
					});
				}
 			},
			fields: [
				{ name: "link", title:"Instance", type: "text", width: 100 },
				{ name: "release", title:"Release", type: "text", width: 30 },
//				{ name: "condition", title:"Condition", type: "text", width: 50 },
				{ name: "install", title:"Old Install", type: "text", width: 50 },
				{ name: "installMessages", title:"Install", type: "text", width: 100 },
				//{ name: "uptime", title:"Uptime", type: "text", width: 50 },
				//{ name: "recent", title:"Recent", type: "text", width: 40 },
				{ name: "countCurrentLocations", title:"Devices", type: "text", width: 80 },
				//{ name: "lastSend.length", title:"Recent Sessions Sent", type: "text", width: 80 }
				{ name: "wifis", title:"Wifi", type: "text", width: 40 },
				{ name: "dests", title:"ChMS", type: "text", width: 40 },
				{ name: "emailString", title: "Emails", type: "text", width: 100 }
			]
		});
    });





// Event Functions




	$("#changeCustomer").change(function() {
		var data = {};
		data.newEntity = $("#changeCustomer").val();
		console.log(data);
		$.ajax({
			url: "/api/setEntity/",
			type: "POST",
			dataType:"html",
			data: data,
			success: function(response) {
				console.log ("getResponse=" + response);
				location.reload();
			}
		});		
	});

	$(".clickCustomSettings").click(function () {
		var data = {};
		data.newCustomAllow = $("#customAllowControlDiv").data().tagsinput.items().toString();
		data.newCustomBlock = $("#customBlockControlDiv").data().tagsinput.items().toString();
		console.log(data);
		$.ajax({
			url: "/api/changeSettings/",
			type: "POST",
			dataType:"html",
			data: data,
			success: function(response) {
				console.log ("getResponse=" + response);
			}
		});
	});

	$("#clickLocations").click(function () {
		var data = {};
		data.newLocations = $("#locationsControlDiv").data().tagsinput.items().toString();
		console.log(data);
		$.ajax({
			url: "/api/changeSettings/",
			type: "POST",
			dataType:"html",
			data: data,
			success: function(response) {
				console.log ("getResponse=" + response);
			}
		});
	});

	$("#clickLogin").click(function () {
		var username = $("#username").val();
		var password = $("#password").val();
		var body = "username="+username+"&password="+password;
		console.log("Calling Login with " + username + " " + password + " -- " + body);
		var url = "/api/auth/?" + body;
		$.get( url, function( response ) {
			console.log(response);
			if (response.status === 1) {
				console.log("Starting Session...");
				setTimeout(function () {window.location.assign("/dashboard.html"); }, 5000);  // Wait 1/2 second then cookies get set before refresh				
			}
        });
	});
	$("#showIP-DISABLED").click(function () {
		console.log("Overlay");
		$("#overlay").show();
		$("#overlay").css({"visibility":"visible"});
	});
	$("#clickSetIP").click(function() {
		console.log("clickSetIP");
		authCheck();
		var data = {};
		data.username = $("#showUser").text();
		data.newIP =$("#newIP").val();
		console.log ("Set IP: Sending: "+data);
		$.ajax({
            url: "/api/changeSettings/",
            type: "POST",
		 	dataType:"html",
		 	data: data,
            success: function(response) {
				console.log ("getResponse=" + response);
				location.reload();
			}
		});
	});
	
});


function authCheck () {
	var url = "/api/authCheck/";
	$.get( url, function( response ) {
		console.log("authCheck: " + response.status);
		if (response.status !== 1) {
			window.location.replace("/admin/login.html");				
		}
	});
}

function logout() {
	var url = "/api/logout/";
	$.get( url, function( response ) {
		console.log("authCheck: " + response.status);
		window.location.replace("/admin/login.html");				
	});	
}


function copyText(region) {
  /* Get the text field */
console.log(region);
  var copyText = document.getElementById(region);
console.log(copyText);
  /* Select the text field */
  copyText.select();

  /* Copy the text inside the text field */
  document.execCommand("copy");

  /* Alert the copied text */
  alert(copyText.value);
}


// recordsByExchange
function drawDevices (rawData) {
			var graphRecords = {};
			var graphType;
			var dataStructure = [];
			var myTempDataPoints =[];
			console.log(rawData);
			for (var i=0; i < rawData.instances.length; i++) {
				var data = {};
				console.log(i);
				var dataset = {};
				if (rawData.instances[i].status) {
					if (rawData.instances[i].status.length > 0) {
						var partner = rawData.instances[i].instance;
						graphRecords[partner] = [];
						console.log(`Partner: ${partner}`);
						//console.log("CHECK");
						var dataRecord = {};
						dataRecord.data = [];
						for (var j=0; j < rawData.instances[i].status.length; j++) {
							var instance = rawData[i];
							var node = rawData.instances[i].status[j];
							//console.log(node);
							//dataRecord.labels.push(node.time);
							var record = {};
							record.label = parseInt(node.time.slice(8));
							record.y = parseInt(node.count);
//							console.log(graphRecords);
//							console.log(partner);
//							console.log(record);
							graphRecords[partner].push(record);
						}
					}
				}
			}
//			console.log(graphRecords);
			Object.keys(graphRecords).forEach(function(key) {
				console.log("Working on: " + key);
				var myDataElement = {        
					type: "line",
					//lineThickness:3,
					showInLegend: true,           
					name: key, 
					dataPoints: graphRecords[key]
				};
				dataStructure.push(myDataElement);
			});
//			console.log(JSON.stringify(dataStructure));
			console.log("BYE");

	var chart = new CanvasJS.Chart("traffic", {
		axisY:{
			logarithmic: true,
			title: "Internet Users",
			titleFontColor: "#51CDA0",
			lineColor: "#51CDA0"
		},
		data: dataStructure
	});
	chart.render();

}


	function loadDetailModal(instance) {
		$("#addChurchUserEmail").val('');
		$("#instanceName").text(instance);
		$("#instanceNameConfirm").text('Confirm Action: ' +instance );
		$("#instanceId").val(instance);
		$("#instanceLink").attr('target',instance);
		$("#instanceLink").attr('href','https://' + instance + '.frontporch.cloud');
		console.log("loadDetailModal: " + instance);
		var emailAll = "";
		$.getJSON( "/api/users?customer=" + instance, function( data ) {
			$("#usersTable").html(``);
			for (var i = 0; i<data.length; i++) {
				if (data[i].length > 3) {
					emailAll = emailAll + data[i] + ",";;
					$("#usersTable").append(`<div><font size=2>${data[i]} &nbsp;<i onclick="deleteUser('${instance}','${data[i]}')" id="${data[i]}" class="deleteAdmin trash icon"></i></div>`);
				}
			
			}
			$("#emailLink").attr('href',`mailto:${emailAll}`);
			$("#addChurchUserCustomer").val(instance);
		});
		$.getJSON( "/api/state", function( data ) {
			console.log("Got State");
			$("#showDetails").text('');
			for (var i=0;i<data.instances.length;i++) {
				if (data.instances[i].instance === instance) {
					var myData = data.instances[i];
					console.log(myData);
					var wifis = Object.keys(myData.state.wifi);
					$("#showDetails").append("Wifi: " + wifis.join(' ') + "<BR>");
					var dests = Object.keys(myData.state.destinations);
					$("#showDetails").append("Destinations: " + dests.join() + "<BR>");
				}
			}
		});
	}
