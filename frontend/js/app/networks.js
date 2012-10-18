function check_host_auth() {
	$('#picasaauthbtn').val('loading');
	bm.imgHost.is_authorized(function (auth_success) {
		if (auth_success === true) {
			$('#picasaauthbtn').val('Revoke Authorization')
			.removeClass('btn-success').addClass('btn-danger').attr("data-action", "logout");
			$('.picasaauth-toggle').show();
		} else {
			$('#picasaauthbtn').val('Authorize').attr("data-action", "login");
		}
	});
}

function check_osn_auth() {
	$('#facebookloginbtn').val('loading');
	bm.osn.is_authorized(function (auth_success) {
		if (auth_success === true) {
			$('#facebookloginbtn').val('Revoke Authorization')
			.removeClass('btn-success').addClass('btn-danger').attr("data-action", "logout");	
			$('.facebookauth-toggle').show();
		} else {
			$('#facebookloginbtn').val('Authorize').attr("data-action", "login");
		}
	});
}

$(document).ready(function () {
	UI.bmMenu("navbar", "networks");	
	check_host_auth();
	check_osn_auth();


	$('#picasaauthbtn').click(function () {
		"use strict";
		if ($(this).attr("data-action") === "logout") {
			bm.imgHost.revokeAuth();
			$(this).val('Authorize');
			$(this).removeClass('btn-danger').addClass('btn-success').attr("data-action", "login");
		} else {
			chrome.tabs.getCurrent(function (tab) {
				bm.imgHost.authorize(tab, check_host_auth);
			});
		}
	});

	$('#facebookloginbtn').click(function () {
		"use strict";
		if ($(this).attr("data-action") === "logout") {
			bm.osn.revokeAuth();
			delete localStorage.facebook_cache;
			delete localStorage.fbauthorized;
			$(this).val('Authorize');
			$(this).removeClass('btn-danger').addClass('btn-success').attr("data-action", "login");
		} else {
			chrome.tabs.getCurrent(function (tab) {
				bm.osn.authorize(true, check_osn_auth);
			});
		}
	});
});

