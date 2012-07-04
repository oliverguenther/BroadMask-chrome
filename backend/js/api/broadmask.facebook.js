function Broadmask_Facebook() {
	"use strict";
	this.bg = chrome.extension.getBackgroundPage();
	this.broadmask = this.bg.broadmask;

	// Facebook API details
	this.app_id = "281109321931593";

	// update cache, but do not force auth
	this.authorize(null, false, this.checkCache);
}

/** 
* Post a signed request to the Facebook Graph API
*
*/
Broadmask_Facebook.prototype.sendFBData = function (url, params, callback) {
	"use strict";
	var token = localStorage.fbtoken;
	if (typeof token !== "undefined") {
		params.access_token = token;
		$.ajax({
			"type": 'POST',
			"url": url,
			"dataType": "json",
			"data": params
		}).done(callback)
		.fail(function(jqXHR, textStatus) { console.error("Request failed: " + textStatus); });
		// $.ajax(url, {data: params, type: "POST", success: callback});
		return true;
	} else {
		return false;
	}
};

/** 
* Send a signed HTTP DELETE request to the Facebook Graph API
*
*/
Broadmask_Facebook.prototype.sendFBDelete = function (url, callback) {
	"use strict";
	var token = localStorage.fbtoken;
	if (typeof token !== "undefined") {
		$.ajax(url, {data: {access_token: token}, type: "DELETE", success: callback});
		return true;
	} else {
		return false;
	}
};

/**
* Retrieve a response a signed Facebook Graph API request.
* */
Broadmask_Facebook.prototype.getFBData = function (url, successcb, errorcb) {
	"use strict";
	var token = localStorage.fbtoken;
	if (typeof token !== "undefined") {
		var jqxhr = $.getJSON(url, {access_token : localStorage.fbtoken}, function (response) {

		})
		.success(function (response) {
			if (typeof response === 'object') {
				successcb(response);
			} else {
				console.log("Signed data request to " + url + " : unexpected response '" + response + "'");
			}
		})
		.fail(function (response) {
			var error = response.status;
			try {
				error = JSON.parse(response.responseText);
			} catch (e) { /* keep error */ }

			if (typeof errorcb === 'function') {
				errorcb(error);
			}
		});
		return true;
	} else {
		return false;
	}
};


Broadmask_Facebook.prototype.is_authorized = function (callback) {
	"use strict";
	var that = this;
	var started = this.getFBData("https://graph.facebook.com/oauth/access_token_info?client_id=" + this.app_id, function (tokeninfo) {
		if (tokeninfo.hasOwnProperty("expires_in") && tokeninfo.expires_in > 1200) {
			callback(true);
		} else {
			callback(false);
		}
	}, function (errormsg) {
		if (typeof errormsg === 'object' && errormsg.error) {
			console.warn("Authorization check failed. Error was " + JSON.stringify(errormsg));
		}
		callback(false);
	});
	if (!started) {
		console.warn("No token available");
		callback(false);
	}
};


Broadmask_Facebook.prototype.request_token = function (activeTab) {
	"use strict";
	var that = this;
	var getParameterByName = function (name, url) {
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regexS = "[\\?&#]" + name + "=([^&#]*)";
		var regex = new RegExp(regexS);
		var results = regex.exec(url);
		if (results === null) {
			return "";
		} else {
			return decodeURIComponent(results[1].replace(/\+/g, " "));
		}
	};
	var grabToken = function () {
		var listener = this;
		chrome.tabs.getAllInWindow(null, function (tabs) {
			for (var i = 0; i < tabs.length; i++) {
				if (tabs[i].url.indexOf("https://www.facebook.com/connect/login_success.html") == 0) {
					var params = getParameterByName("access_token",tabs[i].url);
					localStorage.fbtoken = params;
					// remove Tab
					chrome.tabs.onUpdated.removeListener(listener);
					chrome.tabs.remove(tabs[i].id);
					that.checkCache();
					// return to previous tab
					chrome.tabs.update(activeTab.id, {active: true});
					chrome.tabs.reload(activeTab.id);
					break;
				}
			}
		});
	}

	delete localStorage.fbtoken;
		chrome.tabs.onUpdated.addListener(grabToken);
		chrome.tabs.create({'url': "https://www.facebook.com/dialog/oauth?client_id=" + that.app_id + "&redirect_uri=https://www.facebook.com/connect/login_success.html&response_type=token&scope=publish_stream,read_stream"},
			null);
};

Broadmask_Facebook.prototype.authorize = function (tab, force_first_auth, callback) {
	"use strict";

	var that = this,
	token = localStorage.fbtoken;

	// only perform first auth if forced
	if (!token && force_first_auth) {
		this.request_token(tab);
	} else {
		this.is_authorized(function (isvalid) {
			if (isvalid !== true  && force_first_auth) {
				that.request_token(tab);
			}
		});
	}
};

/**
* Remove the current token, if it exists
*/
Broadmask_Facebook.prototype.revokeAuth = function () {
	"use strict";
	delete localStorage.fbtoken;
}

Broadmask_Facebook.prototype.cache = function () {
	"use strict";
	if (!localStorage.facebook_cache) {
		return {};
	}
	try {
		return JSON.parse(localStorage.facebook_cache);
	} catch (e) {
		console.warn("Couldn't read localStorage cache. " + e);
		return {};
	}
};

Broadmask_Facebook.prototype.userid2name = function (userid) {
	"use strict";
	var cache = this.cache();
	if (cache && cache.friends[userid]) {
		return '<abbr title="' + userid + '">' + cache.friends[userid] + '</abbr>';
	}
	return userid;
};

Broadmask_Facebook.prototype.receiversFromID = function (friendlistID) {
	"use strict";
	var cache = this.cache();
	if (cache.friendlists) {
		var friendlist = JSON.parse(cache.friendlists[friendlistID]),
		members = [];
		$.each(friendlist, function () {
			members.push(this.id);
		});
		return members;
	}
	return null;
};

Broadmask_Facebook.prototype.message_ack = function (message) {
	"use strict";
	if (!message.hasOwnProperty("id") || !message.hasOwnProperty("type")) {
		return;
	}

	if (message.type === 'post') {
		// Like wall post as ACK
		this.sendFBData("https://graph.facebook.com/" + message.id + "/likes", function (response) {
			if (response !== "true") {
				console.warn("Couldn't ACK post " + message.id);
			}
		});
	}
};

Broadmask_Facebook.prototype.armorData = function (message) {
	"use strict";
	var d = [];
	d.push("=== BEGIN BM DATA ===");
	d.push(message);
	d.push("=== END BM DATA ===");
	d.push("This message has been encrypted using Broadmask");
	return d.join("\n");
};

Broadmask_Facebook.prototype.share = function () {
	"use strict";
	var thumbs = document.getElementsByClassName(this.images),
	selected = $("#share-select").val(),
	receivers = this.receiversFromID(selected),
	that = this,
	count = 0,
	toupload = [];
	$.each(thumbs, function (i, val) {
		that.broadmask.uploadImage(selected, receivers, val, function (url) {
			toupload.push(url);
			if (toupload.length === thumbs.length) {
				var message = that.armorData(toupload);
				that.shareOnWall(message, [selected], true, function () {
					$("#status").append("Upload completed");
				});
			}
		});
	});
};

/** 
* share an upload on the logged in user's Facebook wall
* @param message the message to send (if multiple images, include them here!)
* @param link if one image uploaded, link it here!
* @param allowed_users an array of allowed user ids or friendlist ids
* @param callback Called when returned from upload
*/
Broadmask_Facebook.prototype.shareOnWall = function (message, allowed_users, armoring, callback) {
	"use strict";
	// Post to Facebook wall using privacy set to this friendlistid
	var data = {};
	if (armoring) {
		data.message = this.armorData(message);
	} else {
		data.message = message;
	}
	if (allowed_users.length > 0) {
		var privacy = {value: 'CUSTOM', friends: 'SOME_FRIENDS', allow: allowed_users.join(",")};
		data.privacy = JSON.stringify(privacy);
	}
	this.sendFBData("https://graph.facebook.com/me/feed", data, callback);
};

Broadmask_Facebook.prototype.updateFriendlists = function (callback) {
	"use strict";
	var that = this;

	var fetchFriendlistMembers = function (friendlist, callback) {
		var members = [];
		that.getFBData("https://graph.facebook.com/" + friendlist.id + "/members", function (response) {
			$.each(response.data, function (i, user) {
				members.push(user.id);
			});
			callback(friendlist, members);
		});
	};

	var fetchFriendlists = function (friendlists, callback) {
		var completed = 0,
		cached_friendlists = {};
		if (friendlists.length === 0) {
			callback();
		}
		for(var i = 0, len = friendlists.length; i < len; i++) {
			fetchFriendlistMembers(friendlists[i], function(friendlist, members) {
				if (Array.isArray(members) && members.length > 0) {
					cached_friendlists[friendlist.id] = {'id': friendlist.id, 'name': friendlist.name, 'members': members};
				}
				completed++;
				if(completed === friendlists.length) {
					callback(cached_friendlists);
				}
			});
		}
	};

	this.getFBData("https://graph.facebook.com/me/friendlists", function (friendlists) {
		var arr = [];
		$.each(friendlists.data, function () {
			arr.push(this);
		});
		if (arr.length > 0) {
			fetchFriendlists(arr, callback);
		} else {
			// no friendlists found => set empty
			callback([]);
		}
	});
};

Broadmask_Facebook.prototype.updateFriends = function (callback) {
	this.getFBData("https://graph.facebook.com/me/friends", function (friends) {
		var arr = {};
		$.each(friends.data, function () {
			arr[this.id] = this.name;
		});
		callback(arr);
	});
};


Broadmask_Facebook.prototype.updateCache = function (callback) {
	"use strict";

	delete localStorage.facebook_cache;
	var cache = {},
	that = this;
	cache.expires = new Date().getTime() + 172800000; // Expire in 2 days

	that.updateFriends(function (friendsArr) {
		cache.friends = friendsArr;
		that.updateFriendlists(function (friendlistsArr) {
			cache.friendlists = friendlistsArr;
			localStorage.facebook_cache = JSON.stringify(cache);
			callback();
		});
	});

};


/*
* (Re-)Build Facebook cache for Broadmask (friends, friendlists)
* Tries to read cached data from localStorage first
* @param select The select element to output to
*/
Broadmask_Facebook.prototype.checkCache = function (callback) {
	"use strict";
	// strip select from all existing options
	$(this.shareWith).empty();

	var now = new Date().getTime(),
	that = this,
	update = function () {
		var cache = that.cache();
		if (cache.friendlists && cache.friends && (now < cache.expires)) {
			return true;
		}
		return false;
	};

	if (update()) {
		callback({success: true, message: 'Cache up-to-date'});
	} else {
		// update the cache
		delete localStorage.facebook_cache;

		// check for valid token
		this.is_authorized(function (isvalid) {
			if (!isvalid) {
				if (typeof callback === "function") {
					callback({error: true, error_msg: "No Facebook token available. Authorize BroadMask for Facebook in the settings first!"});
				}
			} else {
				var cache = {};
				cache.expires = new Date().getTime() + 172800000; // Expires in 2 days

				that.updateFriends(function (friendsArr) {
					cache.friends = friendsArr;
					that.updateFriendlists(function (friendlistsArr) {
						cache.friendlists = friendlistsArr;
						localStorage.facebook_cache = JSON.stringify(cache);
						if (typeof callback === 'function') {
							callback({success: true, message: 'Cache updated'});
						}
					});
				});
			}
		});
	}
};
