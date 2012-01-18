function getFBData(url, callback) {
	"use strict";
	var token = localStorage.fbtoken;
	if (typeof token !== "undefined") {
		$.getJSON(url, {access_token : token}, function (response) {
			if (typeof response === 'object') {
				callback(response);
			} else {
				console.log("Signed data request to " + url + " : unexpected response '" + response + "'");
			}
		});
	}
}

function sendFBData(url, data, callback) {
	"use strict";
	var token = localStorage.fbtoken;
	if (typeof token !== "undefined") {
		data.access_token = token;
		$.post(url, data, callback);
	}
}

function getFriendlistIDs() {
	"use strict";
	var friendlists = localStorage.friendlists,
		ids = [];
	if (typeof friendlists !== "undefined") {
		$.each(friendlists, function () {
			ids.push(this.id);
		});
	}
	return ids;
}

function updateKeys() {
	"use strict";
	var friendlistids = getFriendlistIDs();
}

function fetchFriendlistMembers(id) {
	"use strict";
	getFBData("https://graph.facebook.com/" + id + "/members", function (members) {
		if (Array.isArray(members.data) && members.data.length > 0) {
			localStorage[id] = JSON.stringify(members.data);
		} else {
			console.log('Could not fetch members for friendlist' + id);
		}
	});
}

/* Requests the friendlists of a user Facebook graph API using
* the fbtoken property in localStorage.
*/
function updateFriendlists(d) {
	"use strict";
	getFBData("https://graph.facebook.com/me/friendlists", function (friendlists) {
		localStorage.friendlists = JSON.stringify(friendlists.data);
		$.each(friendlists.data, function () {
			fetchFriendlistMembers(this.id);
		});
	});
}

function retrieveKey(fbid, callback) {
	getFBData("https://graph.facebook.com/" + fbid + "/notes", function (notes) {
		// Assuming there's only one message with pgpkey
		$.each(notes.data, function () {
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

function grabImagesfromPost(post) {
	"use strict";
	if (post.hasOwnProperty('message')) {
		var i,
			len,
			msg = post.message.split("\n"),
			urls = [];
		if (msg.shift() === "=== BEGIN BM DATA ===" && msg.pop() === "=== END BM DATA ===") {
			for (i = 0, len = msg.length; i < len; i++) {
				urls.push(msg[i].trim());
			}
			return urls;
		} else {
			console.log("Wrong message format!" + post.message);
			return null;
		}
	} else {
		console.log("BM Post has no message property!" + post);
		return null;
	}
}

/** 
 * Extracts all (recent!) posts from Facebook and searches for images.
 * @returns posts An object containing actor_id's with an array of images each
 */
function findBMPosts(callback) {
	"use strict";
	var posts = {},
		query = "SELECT post_id, actor_id, target_id, message FROM stream WHERE filter_key = 'others' AND app_id=281109321931593"; //AND NOT actor_id=me()";
	getFBData("https://api.facebook.com/method/fql.query?format=json&query=" + encodeURIComponent(query), function (data) {
		if (Array.isArray(data)) {
			$.each(data, function () {
				var urls = grabImagesfromPost(this);
				if (urls !== null) {
					// Fill object with poster => urls
					posts[this.actor_id] = urls;
				}
			});
			callback(posts);
		} else {
			console.log("Received response from fql query that isn't an Array of posts" + data);
		}
	});
}

/** 
 * share an upload on the logged in user's Facebook wall
 * @param message the message to send (if multiple images, include them here!)
 * @param link if one image uploaded, link it here!
 * @param allowed_users an array of allowed users
 * @param callback Called when returned from upload
 */
function shareOnWall(message, allowed_users, callback) {
	"use strict";
	// Post to Facebook wall using privacy set to this friendlistid
	var data = {},
		privacy = {value: 'CUSTOM', friends: 'SOME_FRIENDS', allow: allowed_users.join(",")};
	data.message = message;
	data.privacy = JSON.stringify(privacy);
	sendFBData("https://graph.facebook.com/me/feed", data, callback);
}

function fbAuth() {
	chrome.tabs.onUpdated.addListener(chrome.extension.getBackgroundPage().onFacebookLogin);
	chrome.tabs.create({'url': "https://www.facebook.com/dialog/oauth?client_id=281109321931593&redirect_uri=https://www.facebook.com/connect/login_success.html&response_type=token&scope=publish_stream,create_note,read_friendlists"},
		null);
}

/**
* Remove the current token, if it exists
*/
function fbLogout() {
	delete localStorage.fbtoken;
	location.reload(true);
}
