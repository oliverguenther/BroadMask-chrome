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
			//return '<abbr title="' + userid + '">' + cache.friends[userid] + '</abbr>';
			return cache.friends[userid];
		}
	}

	return userid;
}

function cached_friends() {
	try {
		return JSON.parse(localStorage.facebook_cache).friends;
	} catch (e) {
		console.error("Couldn't read from facebook cache. " + e);
		return {};
	}
}

function set_navheight() {
	"use strict";
	if ($('#navbar').height() < $('#app-content').height()) {
		$('#navbar').css({
			'height': $('#app-content').height()
		});
	}
}

Object.size = function (obj) {
	"use strict";
	var size = 0, key;
	for (key in obj) {
		if (obj.hasOwnProperty(key)) { size += 1; }
	}
	return size;
};

Object.pop = function (obj) {
	for (var key in obj) {
		return obj[key];
	}
	return null;
}

function resetForm(form) {
	// Reset form
	"use strict";
	$(form).find('input:text, input:password, input:file, select').val('');
	$(form).find('input:radio, input:checkbox').removeAttr('checked').removeAttr('selected');
}

function resetFormErrors() {
	"use strict";
	$(".control-group.error").removeClass("error");
	$(".error-block").remove();
}

function formError(id, message) {
	"use strict";
	$(id).parent().parent().addClass("error");
	$(id).after('<p class="help-block error-block">' + message + '</p>');
	return false;
}

function disableForm(id) {
	$(id + " :input").attr("disabled", true);
}

$(document).ready(function () {
	"use strict";

	set_navheight();
	$('#app-content').watch('height', set_navheight);
});
