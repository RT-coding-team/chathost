$(function() {

if (window.location.pathname === "/admin/login.html") {
}
else {
	console.log("authCheck");
	//authCheck();
}

$("#hideWhenNoID1").hide();
$("#hideWhenNoID2").hide();
$("#hideWhenNoID3").hide();

var allData = {};


// Loading Box Table
	$.getJSON( "/chathost/admin/boxes", function( data ) {
		console.log(data)		
		var columns = [
            { title: "Site Name", field: "sitename" },
            { title: "Boxid", field: "boxid"},
            { title: "CTS", field: "cts"},            
            { title: "Site Admin", field: "siteadmin_name"},      
            { title: "Last Sync", field: "date" }            
        ];
		var final = [];
		for (var item of data) {
			var fitem = [];
			item.date = moment(item.timestamp * 1000).format('LLL');
			item.cts = `${item.courses}-${item.teachers}-${item.students}`;
			for (var col of columns) {
				fitem.push(item[col.field] || '');
			}
			final.push(fitem);
		}
	});

// LOADING System
    $.getJSON( "/chathost/admin/system", function( data ) {
		for (var key of Object.keys(data)) {
			console.log(key);
			if (data[key] === true) {
				data[key] = "Up";
			}
			else if (data[key] === false) {
				data[key] = "Down";
			}
			$('#stat-' + key).text(data[key]);
		}
    });





// Event Functions   todo




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

