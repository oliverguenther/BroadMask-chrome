/** Insert menu to id, highlight current page */
function bmMenu(id, active) {
	var root = document.getElementById(id),
	mdata = [
			{header: "Facebook"},
			{key: "upload", icon: "icon-comment", content: "Share content"},
			{key: "instances", icon: "icon-lock", content: "Manage instances"},
			{key: "users", icon: "icon-user", content: "Manage users"},
			"sep",
			{header: "BroadMask"},
			{key: "settings", icon: "icon-cog", content: "Settings"},
			{key: "help", icon: "icon-question-sign", content: "Help"},
			{key: "info", icon: "icon-info-sign", content: "About"}
		];
	menu = [];
	for (var i = 0, len = mdata.length; i < len; i += 1) {
		var entry = mdata[i];
		if (entry === "sep") {
			menu.push('<li class="divider"></li>');
		} else if (entry.header) {
			menu.push('<li class="nav-header">' + entry.header+ '</li>');
		} else {
			menu.push('<li ' + (active === entry.key ? 'class="active"' : '') + '>');
			menu.push('<a href="' + entry.key + '.html"' + '><i class="' + (active === entry.key ? 'icon-white ' : '') + entry.icon + '"></i> ' + entry.content + '</a>');
			menu.push('</li>');
		}
	}
	root.innerHTML = menu.join("");
}


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
