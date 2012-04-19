function error(msg) {
	$("#errors").append("<p>" + msg + "</p>");
	$("#errormsg").show();
}

function debug(msg) {
	$("#errors").append("<p>DEBUG: " + msg + "</p>");
	$("#errormsg").show();
}

function hideErrors() {
	$("#errormsg").hide();
	$("#errors").empty();
}

function userid2name(userid) {
	"use strict";
	if (localStorage.facebook_cache) {
		var cache = JSON.parse(localStorage.facebook_cache);
		if (cache && cache.friends[userid]) {
			return '<abbr title="' + userid + '">' + cache.friends[userid] + '</abbr>';
		}
	}

	return userid;
}

function set_navheight() {
	if ($('#navbar').height() < $('#app-content').height()) {
		$('#navbar').css({
			'height': $('#app-content').height()
		});
	}
}

$(document).ready(function () {
	"use strict";

	set_navheight();
	$('#app-content').watch('height', set_navheight);

});
