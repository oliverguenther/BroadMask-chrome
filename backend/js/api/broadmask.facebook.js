function Broadmask_facebook() {
	"use strict";
	this.bg = chrome.extension.getBackgroundPage();
	this.broadmask = this.bg.broadmask;

	// Facebook API details
	this.app_id = "281109321931593";

	// update cache
	this.checkCache();

	/**
	* Retrieve a response a signed Facebook Graph API request.
	* */
	this.getFBData = function (url, callback) {
		$.getJSON(url, {access_token : localStorage.fbtoken}, function (response) {
			if (typeof response === 'object') {
				callback(response);
			} else {
				console.log("Signed data request to " + url + " : unexpected response '" + response + "'");
			}
		});
	};

	/** 
	* Post a signed request to the Facebook Graph API
	*
	*/
	this.sendFBData = function (url, data, callback) {
		var token = localStorage.fbtoken;
		if (typeof token !== "undefined") {
			data.access_token = token;
			$.post(url, data, callback);
		}
	};

}

Broadmask_facebook.prototype.is_token_valid = function (callback) {
	"use strict";
	this.getFBData("https://graph.facebook.com/oauth/access_token_info?client_id=" + this.app_id, function (tokeninfo) {
		if (tokeninfo.hasOwnProperty("expires_in") && tokeninfo.expires_in > 1200) {
			callback(true);
		} else {
			callback(false);
		}
	});
};

Broadmask_facebook.prototype.authorize = function (callback) {
	"use strict";

	var that = this;

	var requestToken = function () {
		delete localStorage.fbtoken;
		chrome.tabs.getCurrent(function (tab) {
			chrome.tabs.onUpdated.addListener(function () {
				chrome.extension.getBackgroundPage().onFacebookLogin(callback, tab);
			});
			chrome.tabs.create({'url': "https://www.facebook.com/dialog/oauth?client_id=" + that.app_id + "&redirect_uri=https://www.facebook.com/connect/login_success.html&response_type=token&scope=publish_stream,create_note,read_friendlists"},
				null);
		});
	};

	var token = localStorage.fbtoken;
	if (!token) {
		requestToken();
	}

	this.is_token_valid(function (isvalid) {
		if (isvalid !== true) {
			requestToken();
		}
	});
};

/**
* Remove the current token, if it exists
*/
function fbRevokeAuth(callback) {
	delete localStorage.fbtoken;
	callback();
}

Broadmask_facebook.prototype.cache = function () {
	"use strict";
	var cache = this.bg.get('facebook_cache');
	if (cache) {
		return JSON.parse(cache);
	}
	return {};
};

Broadmask_facebook.prototype.userid2name = function (userid) {
	"use strict";
	var cache = this.cache();
	if (cache && cache.friends[userid]) {
		return '<abbr title="' + userid + '">' + cache.friends[userid] + '</abbr>';
	}
	return userid;
};

Broadmask_facebook.prototype.receiversFromID = function (friendlistID) {
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

Broadmask_facebook.prototype.armorData = function (dataArr) {
	"use strict";
	// TODO replace with GPG signature
	var i, len;
	dataArr.unshift("=== BEGIN BM DATA ===");
	dataArr.push("=== END BM DATA ===");
	return dataArr.join("\n");

};

Broadmask_facebook.prototype.share = function () {
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
				that.shareOnWall(message, [selected], function () {
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
Broadmask_facebook.prototype.shareOnWall = function (message, allowed_users, callback) {
	"use strict";
	// Post to Facebook wall using privacy set to this friendlistid
	var data = {},
	privacy = {value: 'CUSTOM', friends: 'SOME_FRIENDS', allow: allowed_users.join(",")};
	data.message = message;
	data.privacy = JSON.stringify(privacy);
	sendFBData("https://graph.facebook.com/me/feed", data, callback);
};

/** 
* share multiple messages on the logged in user's Facebook wall
* @param messages the message to send (object)
* @param callback Called when returned from upload
*/
Broadmask_facebook.prototype.shareBatch = function (messages, callback) {
	"use strict";
	var token = localStorage.fbtoken,
	max_batchsize = 50,
	count = 0,
	timer = function (delay, subset) {
		setTimeout(function () {
			$.post("https://graph.facebook.com/?batch=" + encodeURIComponent(JSON.stringify(subset)), {"access_token" : token}, function () {
				count += subset.length;
				if (count === messages.length) {
					callback();
				}
			});
		}, 1000 * delay);
	};
	if (typeof token !== "undefined") {
		for (var i = 0, slicelen = (messages.length / max_batchsize); i <= slicelen; i++) {
			var subset = messages.slice(i*max_batchsize, (i+1)*max_batchsize);
			if (subset.length > 0) {
				timer(i, subset);
			}
		}
	}
}

Broadmask_facebook.prototype.updateFriendlists = function (callback) {
	"use strict";

	var fetchFriendlistMembers = function (friendlist, callback) {
		var members = [];
		this.getFBData("https://graph.facebook.com/" + friendlist.id + "/members", function (response) {
			$.each(response.data, function (i, user) {
				members.push(user.id);
			});
			callback(friendlist, members);
		});
	};

	var fetchFriendlists = function (friendlists, callback) {
		var completed = 0,
		cached_friendlists = [];
		if (friendlists.length === 0) {
			callback();
		}
		for(var i = 0, len = friendlists.length; i < len; i++) {
			fetchFriendlistMembers(friendlists[i], function(friendlist, members) {
				if (Array.isArray(members) && members.length > 0) {
					cached_friendlists[friendlists[i]] = {'id': friendlist.id, 'name': friendlist.name, 'members': members};
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
		fetchFriendlists(arr, callback);
	});
};

Broadmask_facebook.prototype.updateFriends = function (callback) {
	this.getFBData("https://graph.facebook.com/me/friends", function (friends) {
		var arr = [];
		$.each(friends.data, function () {
			arr.push(this.id);
		});
		callback(arr);
	});
};


Broadmask_facebook.prototype.updateCache = function (callback) {
	"use strict";

	delete localStorage.facebook_cache;
	var cache = {},
	that = this;
	cache.expires = new Date().getTime() + 172800; // Expires in 2 days

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
Broadmask_facebook.prototype.checkCache = function () {
	"use strict";
	// strip select from all existing options
	$(this.shareWith).empty();

	var now = new Date().getTime(),
	that = this,
	update = function () {
		var cache = that.cache();
		if (cache.friendlists && cache.friends && (now < cache.expires)) {
			var options = [];

			$.each(cache.friendlists, function () {
				options.push('<option value="' + this.id + '">' + this.name + '</option>');
			});
			if (options.length > 0) {
				$("#share-select").append(options.join(''));
				return true;
			}
		}
		return false;
	};

	if (!update()) {
		// update the cache
		delete localStorage.facebook_cache;
		var cache = {},
		that = this;
		cache.expires = new Date().getTime() + 172800; // Expires in 2 days

		that.updateFriends(function (friendsArr) {
			cache.friends = friendsArr;
			that.updateFriendlists(function (friendlistsArr) {
				cache.friendlists = friendlistsArr;
				localStorage.facebook_cache = JSON.stringify(cache);
				callback();
			});
		});
	}
};
