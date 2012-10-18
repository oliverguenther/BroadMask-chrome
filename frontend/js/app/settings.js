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


function get_stored_profiles() {
	var profiles = bm.module.get_stored_profiles(),
	active_profile = bm.module.active_profile,
	is_unlocked = false,
	tabled = [];

	if (active_profile) {
		var unlockresult = bm.module.unlock_profile(active_profile);
		is_unlocked = !unlockresult.error;
	}

	if (Object.size(profiles) > 0) {
		$.each(profiles, function (name, key) {
			var is_active = ((active_profile === name) && is_unlocked);
			tabled.push("<tr class=\"" + (is_active ? "highlight-row" : "") + "\"><td>" + name + "</td>");
			tabled.push("<td>" + key + "</td><td>");
			if (!is_active) {
				tabled.push("<a class=\"btn-make-active\" href=\"#\" data-profilename=\"" + name + "\"><i class=\"icon-user\"></i> Use this profile</a><br/>");
			}  else {
				tabled.push("<a class=\"btn-delete-profile\" href=\"#\" data-profilename=\"" + name + "\" href=\"javascript:delete_profile(\$(this));\" ><i class=\"icon-remove\"></i> Delete this profile</a></td></tr>");
			}
		});
		$("#current_profiles").replaceWith('<table class="table table-bordered table-striped"><thead><tr><th>Name</th><th>PGP-Key</th><th>Action</th></tr></thead><tbody>' + tabled.join("") + '</tbody></table>');
		$(".btn-make-active").click(function () {
			var name = $(this).attr("data-profilename"),
			result = bm.module.unlock_profile(name);
			if (result.error === true) {
				UI.error("Could not unlock profile: " + result.error_msg);
				return;
			}
			get_stored_profiles();
		});

		$(".btn-delete-profile").click(function () {
			var name = $(this).attr("data-profilename");
			if (confirm("Are you sure you want to delete the active profile '" + name + "'?.\n" 
			+ "This will remove ALL communication groups you have created using this profile.")) {
				bm.module.delete_profile(name);
				get_stored_profiles();
			}
		});
	}
}

function update_keyselect() {
	// Get private PGP keys
	var keys = bm.module.gpg_search_keys("",1);
	if (Object.size(keys) > 0) {
		var options = [];
		$.each(keys, function (id, keydata) {
			options.push('<option value="' + id + '">' + keydata.name + ' (' + id + ')</option>');
		});
		$("#add_profile_keyselect").removeAttr("disabled").empty().append(options.join(""));
	}
}

$(document).ready(function () {
	UI.bmMenu("navbar", "settings");	

	// check auth status
	check_host_auth();
	check_osn_auth();

	// update stored profiles for list
	get_stored_profiles();

	// update private key selection
	update_keyselect();


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

	$("#btn-create-profile").click(function() {
		var name = $("#add_profile_name").val(),
		key = $("#add_profile_keyselect").val(),
		profiles = bm.module.get_stored_profiles();

		// Clear previous form errors
		UI.resetFormErrors();

		if (!name) { UI.formError("#add_profile_name", "Profile name cannot be empty");	}
		else if (profiles.hasOwnProperty(name)) { UI.formError("#add_profile_name", "Profile name exists already");	}
		else if (!key) { UI.formError("#add_profile_keyselect", "No GPG private key selected");	}
		else { bm.module.add_profile(name, key); get_stored_profiles();}

		return false;

	});




});
