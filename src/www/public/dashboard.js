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


	$.getJSON( "/chathost/admin/boxes", function( data ) {
		console.log(data)
		
		var columns = [
            { title: "Site Name", field: "sitenameWithDetails" },
            { title: "Boxid", field: "boxid"},
            { title: "CTS", field: "cts"},            
            { title: "Site Admin", field: "siteadmin_name"},      
            { title: "Last Sync", field: "date" }            
        ];
		
		
		
		var final = [];
		for (var item of data) {
			var fitem = [];
			item.sitenameWithDetails = `<span data-toggle="modal" data-target="#detailModal" onclick="loadDetailModal('${item.boxid}')">${item.sitename}</span>`;
			item.date = moment(item.timestamp * 1000).format('LLL');
			item.cts = `${item.courses}-${item.teachers}-${item.students}`;
			for (var col of columns) {
				fitem.push(item[col.field] || '');
			}
			final.push(fitem);
		}
		
		$('#statusGrid').DataTable( {
			data: final,
			columns: columns
		});

	});

// LOADING System
    $.getJSON( "/chathost/admin/system", function( data ) {
    	data.updated = moment(data.timestamp * 1000).format('LLL');
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



});

