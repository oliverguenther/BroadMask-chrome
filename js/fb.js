function getFBData(url, callback) {
	var token = localStorage.fbtoken;
	if (typeof token !== "undefined") {
		$.getJSON(url, {access_token : token}, function (response) {
			if (response.hasOwnProperty('data')) {
				callback(response.data);
			} else {
				debug("Signed data request to " + url + " : unexpected response '" + response + "'");
			}
		});
	}
}

function getFriendlistIDs() {
	var friendlists = localStorage.friendlists;
	var ids = [];
	if (typeof friendlists !== "undefined") {
		$.each(friendlists, function () {
			ids.push(this.id);
		});
	}
	return ids;
}

function updateKeys() {
	var friendlistids = getFriendlistIDs();
	
}

function fetchFriendlistMembers(id) {
	getFBData("https://graph.facebook.com/" + id + "/members", function (members) {
		if (Array.isArray(members) && members.length > 0) {
			localStorage[id] = JSON.stringify(members);
		} else {
			debug('Could not fetch members for friendlist' + id);
		}
	});
}

/* Requests the friendlists of a user Facebook graph API using
* the fbtoken property in localStorage.
*/
function updateFriendlists(d) {
	getFBData("https://graph.facebook.com/me/friendlists", function (friendlists) {
		localStorage.friendlists = JSON.stringify(friendlists);
		$.each(friendlists, function () {
			fetchFriendlistMembers(this.id);
		});
	});
}

function retrieveKey(fbid, callback) {
	getFBData("https://graph.facebook.com/" + fbid + "/notes", function (notes) {
		// Assuming there's only one message with pgpkey
		$.each(notes, function () {
			if (this.hasOwnProperty("subject") && this.hasOwnProperty("message") && this.subject === "PGPkey") {
				// FB pads content in <div><p>KEY</p></div>
				var key = $($(this.message).html()).html();
				debug(key);
				callback(key);
			}
		});
	});
}

function hasKnownKey(fbid) {
	// TODO
	if (typeof localStorage[fbid] !== "undefined") {
		var friend = JSON.parse(localStorage[fbid]);
		return friend.hasOwnProperty("pgpkey");
	}
}


function onFriendlistSelected() {
	var id = $("#friendlists").val();
	if (typeof localStorage[id] !== "undefined") {
		var friendlist = JSON.parse(localStorage[id]);
		if (friendlist.length > 0) {
			$("#selectedfriends").html('<h3>Your images will be shared with the following friends</h3>');
			$.each(friendlist, function () {
				if (hasKnownKey(this.id)) {
					$("#selectedfriends").append('<span class="selectedfriend">' + this.name + '</span>');
				}
			});
		}
	}
}

function displayFriendlist() {
	var	friendlists = JSON.parse(localStorage.friendlists);
	if (typeof friendlists !== "undefined") {
		$("#friends").html('<form><fieldset><div class="clearfix"><label for="friendlists">Friendlists</label><div class="input"><select id="friendlists" onchange="onFriendlistSelected()"></select></div></div></fieldset></form>');
		$.each(friendlists, function () {
			// If friendlist has locally stored members
			if (typeof localStorage[this.id] !== "undefined") {
				$("#friendlists").append('<option value="' + this.id + '">' + this.name + '</select>');
			}
		});
	}
}

function fbAuth() {
	chrome.tabs.onUpdated.addListener(chrome.extension.getBackgroundPage().onFacebookLogin);
	chrome.tabs.create({'url': "https://www.facebook.com/dialog/oauth?client_id=281109321931593&redirect_uri=https://www.facebook.com/connect/login_success.html&response_type=token"},
		null);
}

/**
* Remove the current token, if it exists
*/
function fbLogout() {
	delete localStorage.fbtoken;
	location.reload(true);
}
