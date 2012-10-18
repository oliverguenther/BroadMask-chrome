function cached_friends() {
	try {
		return bm.osn.cache().friends;
	} catch (e) {
		console.error("Couldn't read from facebook cache. " + e);
		return {};
	}
}


function print_stored_map() {
	var users = bm.module.gpg_associatedKeys(),
	friends = cached_friends();
	var rows = [];
	
	if (users.error === true) {
		UI.error("Error loading instances:" + users.error_msg);
		return;
	}
	
	$.each(users, function(id, key_id) {
		var friend_name = friends[id];
		rows.push("<tr><td>");
		rows.push(friend_name);
		rows.push("</td><td>");
		rows.push(id);
		rows.push("</td><td>");
		rows.push(key_id);
		rows.push('</td><td class="centered"><a href="javascript:keylist_remove(');
		rows.push(id); 
		rows.push(')"><i class="icon-minus-sign"></i></a></td></tr>');
	});
	if (rows.length > 0) {
		$("#user_list").replaceWith('<table class="table table-bordered table-striped"><thead><tr><th>Name</th><th>ID</th><th>PGP Key-ID</th><th>Remove</th></tr></thead><tbody>' + rows.join("") + '</tbody></table>');
	}

}

function keylist_remove(userid) {
	if (confirm("Do you want to disable the GPG key mapping for user " + userid + "?")) {
		bm.module.gpg_remove_key(String(userid));
		location.reload(true);
	}
}

function parsePGPkey(data) {
	if (!data.hasOwnProperty("message")) {
		return;
	}
	var keyid = data.message.toLowerCase().match(/0x[a-z0-9]+/i);
	if (keyid[0]) {
		$.get("http://pgp.mit.edu:11371/pks/lookup", {op : "get", search : keyid[0]}, function (response) {
			var key_result = $(response).filter("pre");
			if (key_result && key_result.length > 0) {
				var result = bm.module.gpg_import_key(key_result[0].innerText, true);
				if (!result || result.error) {
					error("Could not import key. Error was: " + result.error_msg);
				} else if (Object.size(result.imports) === 1) {
					var imported_key = Object.pop(result.imports);
					bm.module.gpg_store_keyid(data.actor_id.toString(), imported_key.fingerprint);
					print_stored_map();
				} else {
					console.log("Found multiple keys for " + data.actor_id + ": " + JSON.stringify(result) + " . Insert mapping manually");
				}
			}
		});
	}
}

$(document).ready(function () {
	UI.bmMenu("navbar", "users");	
	print_stored_map();

	/** Create autocomplete cache for friends */
	var typeaheadFriends = function () {
		var friends = cached_friends();
		if (Object.size(friends) === 0) {
			UI.setFormDisabled("#create_user_map", true);
			return;
		}

		var users_typeahead = [], 
		users_id_map = {};

		$.each(friends, function (id, name) {
			users_typeahead.push(name);
			users_id_map[name] = id;
		});
		$("#friend_name").typeahead({
			"source": users_typeahead,
			"items": 5,
		});

		$("#btn-create-mapping").click(function () {
			$("#create_user_success").hide();
			UI.resetFormErrors();
			var user = {};

			if (!$("#friend_name").val()) {
				return formError("#friend_name", "No user name specified");
			}
			user.name = $("#friend_name").val();
			user.id = users_id_map[user.name];
			if (!user.id) {
				return formError("#friend_name", "User id for user " + user.name + " not found.");
			}

			if ($("#key_id").val()) {
				user.key_id = $("#key_id").val().split(" ").join(""); // remove spaces from fingerprint
				var result = bm.module.gpg_import_key(user.key_id, false);

				if (result.error) {
					return formError("#key_id", "Could not find key with id " + user.key_id + ". Error was: " + result.error_msg);
				} else if (Object.size(result) === 1) {
					bm.module.gpg_store_keyid(user.id, user.key_id);
					$("#create_user_success").show();
					resetForm("#create_user_map");
					print_stored_map();
				} else {
					return formError("#key_id", "Couldn't find unique key-id. Input yielded " + Object.size(result)  + " results. Enter a complete PGP-key id or fingerprint");
				}
			} else if ($("#key_block").val()) {
				var key_data = $("#key_block").val();
				var result = bm.module.gpg_import_key(key_data, true);
				if (!result || result.error) {
					return formError("#key_block", "Could not import key. Error was: " + result.error_msg);
				} else if (Object.size(result.imports) === 1) {
					var imported_key = Object.pop(result.imports);
					bm.module.gpg_store_keyid(user.id, imported_key.fingerprint);
					$("#create_user_success").show();
					resetForm("#create_user_map");
					print_stored_map();
				} else {
					return formError("#key_block", "Couldn't extract PGP-key. (Found " + Object.size(result.imports) + " keys). Paste one PGP-block only!");
				}
			}
			return false;
		});
	};

	if (localStorage.facebook_cache) {
		typeaheadFriends();
	} else {
		// Check and update cache
		bm.osn.checkCache(typeaheadFriends);
	}



	// mapping refresh
	$("#user_mapping_refresh").click(function () {
		$(this).button('loading');//AND app_id=281109321931593 
		query = "SELECT post_id, actor_id, target_id, message FROM stream WHERE filter_key = 'others' AND strpos(lower(message), 'My PGP-Key:')"; //AND NOT actor_id=me()";
		bm.osn.getFBData("https://api.facebook.com/method/fql.query?format=json&query=" + encodeURIComponent(query), function (data) {
			if (data.length > 0) {
				for (var i = 0, len = data.length; i < len; i++) {
					parsePGPkey(data[i]);
				}
			} else {
				console.log("No keys found.");
				console.log(data);
			}
		});
	});

	// Get private PGP keys
	var keys = bm.module.gpg_search_keys("",1);
	if (Object.size(keys) > 0) {
		var options = [];
		$.each(keys, function (id, keydata) {
			options.push('<option value="' + id + '">' + keydata.name + ' (' + id + ')</option>');
		});
		$("#key-select").removeAttr("disabled").empty().append(options.join(""));
		$("#upload-key-btn").removeAttr("disabled")
		.click(function() {
			var keyid = "My PGP-Key: 0x" + $("#key-select").val();
			bm.osn.sendFBData("https://graph.facebook.com/me/feed", {privacy : JSON.stringify({value: 'ALL_FRIENDS'}), message : keyid}, function (response) {
				location.reload(true);
			});
			return false;
		});
	}


	// Check PGP keys from FB
	var query = "SELECT post_id, actor_id, target_id, message FROM stream WHERE source_id = me() AND app_id = '281109321931593' AND strpos(lower(message), 'my pgp-key:') >= 0";
	var sent = bm.osn.getFBData("https://graph.facebook.com/method/fql?q=" + encodeURIComponent(query), function (response) {
		if (response.data.length > 0) {
			var data = response.data;
			var keyid = data[0].message.toLowerCase().match(/0x[a-z0-9]+/i)[0];
			if (!keyid) { 
				console.error("Found PGP key message, but couldn't parse content! " + data[0].message); 
			} else {
				$("#key-info").val(keyid);
				$("#remove-key-btn").removeAttr("disabled").attr("data-posts", JSON.stringify(data))
				.click(function () {
					$.each(data, function(i, post) {
						bm.osn.sendFBDelete("https://graph.facebook.com/" + post.post_id, function (response) { 
							location.reload(true);
						});
					});
					return false;
				});
				$("#btn_lookup_key").attr("data-postid", data[0].post_id)
				.removeAttr("disabled")
				.click(function() {
					var post_id = $(this).attr("data-postid");
					bm.osn.getFBData("https://graph.facebook.com/" + post_id, function(response) {
						if (response.hasOwnProperty("actions")) {
							chrome.tabs.create({url: response.actions[0].link});
						} else {
							error("Can't relocate to post with id " + post_id);
						}
					});
				});

			}
		} else {
			$("#key-info").val("None published");
		}
	});

	if (!sent) {
		$("#key-info").val("Missing access token");
	}

});
