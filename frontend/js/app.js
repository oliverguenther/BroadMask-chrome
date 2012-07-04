// Set global variables used througout frontend
var bg = chrome.extension.getBackgroundPage();
var bm = bg.broadmask;


// UI accessor methods
var UI = {

	// Create the plugin sidebar menu
	// highlighting the given page id
	bmMenu: function (id, active) {
		var root = document.getElementById(id),
		mdata = [
			{header: "BroadMask"},
			{key: "upload", icon: "icon-comment", content: "Share Content"},
			{key: "instances", icon: "icon-lock", content: "Manage Groups"},
			{key: "users", icon: "icon-user", content: "Key Mappings"},
			{key: "networks", icon: "icon-globe", content: "Social Networks"},
			"sep",
			{key: "settings", icon: "icon-wrench", content: "Settings"}
			// {key: "help", icon: "icon-question-sign", content: "Help"},
			// {key: "info", icon: "icon-info-sign", content: "About"}
		],
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
	}, 

	// Display a debug message
	debug: function (msg) {
		$("#errors").append("<p>DEBUG: " + msg + "</p>");
		$("#errormsg").show();
	},

	// Display an error message
	error: function (msg) {
		if ($("#errors").size() === 0) {
			$("#app-content").prepend('<div class="alert alert-error alert-block" id="errormsg" style="display:none">'
			+ '<a class="close" href="javascript:UI.emptyErrors()">×</a><h4 class="alert-heading">Error!</h4><div id="errors">'
			+ '</div></div>');
		}
		$("#errors").append("<p>" + msg + "</p>");
		$("#errormsg").show();
	},

	// Remove previous errors
	emptyErrors: function () {
		$("#errormsg").hide();
		$("#errors").empty();
	},

	formError: function (id, message) {
		$(id).parent().parent().addClass("error");
		$(id).after('<p class="help-block error-block">' + message + '</p>');
		return false;
	},

	// Display a Bootstrap modal
	modal: function(par, id, header, body) {
		var md = [];
		md.push("<div class=\"modal fade\" id=\"modal" + id + "\">");
		md.push('<div class="modal-header"><button class="close" data-dismiss="modal">×</button>');
		md.push('<h3>' + header + '</h3></div><div class="modal-body">');
		md.push(body);
		md.push('</div>');
		md.push('<div class="modal-footer"><a href="#" class="btn" data-dismiss="modal">Close</a></div></div>');
		$(par).append(md.join(""));
		$("#modal" + id).modal("show");
	},

	// Reset all input elements of id form
	resetForm: function (form) {
		// Reset form
		$(form).find('input:text, input:password, input:file, select').val('');
		$(form).find('input:radio, input:checkbox').removeAttr('checked').removeAttr('selected');
	},

	// Reset all Bootstrap error markers
	resetFormErrors: function () {
		$(".control-group.error").removeClass("error");
		$(".error-block").remove();
	},

	// Toggle Form Disabled state
	setFormDisabled: function (id, disable) {
		$(id + " :input").attr("disabled", disable);
	}
};

$(document).ready(function () {
	// updates the frontend's sidebar to match
	// the total page height
	var set_navheight = function () {
		if ($('#navbar').height() < $('#app-content').height()) {
			$('#navbar').css({
				'height': $('#app-content').height()
			});
		}
	};

	// Call first to set height
	set_navheight();

	// Set watchdog to update height
	$('#app-content').watch('height', set_navheight);
});
