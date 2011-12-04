function error(msg) {
	$("#errormsg").append("<p>" + msg + "</p>");
	$("#errormsg").show();
}

function debug(msg) {
	$("#errormsg").append("<p>DEBUG: " + msg + "</p>");
	$("#errormsg").show();
}

