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

function modal(par, id, header, body) {
	var md = [];
	md.push("<div class=\"modal fade\" id=\"modal" + id + "\">");
	md.push('<div class="modal-header"><button class="close" data-dismiss="modal">×</button>');
	md.push('<h3>' + header + '</h3></div><div class="modal-body">');
	md.push(body);
	md.push('</div>');
	md.push('<div class="modal-footer"><a href="#" class="btn" data-dismiss="modal">Close</a></div></div>');
	$(par).append(md.join(""));
	$("#modal" + id).modal("show");
}

function userid2name(userid) {
	"use strict";
	var cache = chrome.extension.getBackgroundPage().broadmask.osn.cache();
	if (cache && cache.friends[userid]) {
		return cache.friends[userid];
	}
	return userid;
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
