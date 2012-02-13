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

function updatePicasaBtn(btn) {
	"use strict";
	if ($(btn).val() === 'Authorize') {
		chrome.extension.getBackgroundPage().broadmask.imgHost.performAuth(function () {
			$(btn).val('Revoke Authorization');
			$(btn).removeClass('btn-success').addClass('btn-danger');
		});
	} else {
		chrome.extension.getBackgroundPage().broadmask.imgHost.revokeAuth(function () {
			$(btn).val('Authorize');
			$(btn).removeClass('btn-danger').addClass('btn-success');
		});
	}
}

$(document).ready(function () {
	/** Update buttons */

	if (chrome.extension.getBackgroundPage().oauth.hasToken()) {
			$('#picasaauthbtn').val('Revoke Authorization');
			$('#picasaauthbtn').removeClass('btn-success').addClass('btn-danger');
	}

	if (localStorage.fbtoken) {
			$('#facebookloginbtn').val('Revoke Authorization');
			$('#facebookloginbtn').removeClass('btn-success').addClass('btn-danger');	
	}

	$('#picasaauthbtn').click(function (btn) {
		"use strict";
		if ($(btn).val() === 'Authorize') {
			fbAuth(function () {
				$(btn).val('Revoke Authorization');
				$(btn).removeClass('btn-success').addClass('btn-danger');
			});
		} else {
			fbRevokeAuth(function () {
				$(btn).val('Authorize');
				$(btn).removeClass('btn-danger').addClass('btn-success');
			});
		}
	});
	$('#facebookloginbtn').click(function (btn) {
		"use strict";
		if ($(btn).val() === 'Authorize') {
			fbAuth(function () {
				$(btn).val('Revoke Authorization');
				$(btn).removeClass('btn-success').addClass('btn-danger');
			});
		} else {
			fbRevokeAuth(function () {
				$(btn).val('Authorize');
				$(btn).removeClass('btn-danger').addClass('btn-success');
			});
		}
	});
});
