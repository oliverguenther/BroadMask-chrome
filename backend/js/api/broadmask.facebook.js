function Broadmask_facebook(d, id) {
	"use strict";
	this.broadmask = chrome.extension.getBackgroundPage().broadmask;
	this.d = d;
	this.images = null;
	this.root = d.getElementById(id);

	var sharef = this.share.bind(this),
	that = this;
	$(document).ready(function () {
		$('#share-submit-btn').click(sharef);
		$('#share-reset-btn').click(function () {
			$(".uploadprogress").remove();
			$("#share-select").attr("disabled", "disabled");
			$("#share-submit-btn").attr("disabled", "disabled");
			$("#share-reset-btn").attr("disabled", "disabled");
		});
	});

	// fetch friends
	this.checkCache();

}

Broadmask_facebook.prototype.cache = function () {
	"use strict";
	if (localStorage.facebook_cache) {
		var cache = JSON.parse(localStorage.facebook_cache);
		return cache;
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
	if (localStorage[friendlistID]) {
		var friendlist = JSON.parse(localStorage[friendlistID]),
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
				shareOnWall(message, [selected], function () {
					$("#status").append("Upload completed");
				});
			}
		});
	});
};

/*
* Show the sharing pane when called
* @param thumbClassname the classname of images to handle
* will scan for 'rel'-attribute for uploaded url
*/
Broadmask_facebook.prototype.enableSharing = function (thumbClassname) {
	"use strict";
	if (thumbClassname) {
		this.images = thumbClassname;
		$("#share-select").removeAttr("disabled").empty();
		$("#share-submit-btn").removeAttr("disabled");
		$("#share-reset-btn").removeAttr("disabled");
		this.checkCache();
	}
};


Broadmask_facebook.prototype.updateFriendlists = function (callback) {
	"use strict";

	var fetchFriendlistMembers = function (friendlist, callback) {
		var members = [];
		getFBData("https://graph.facebook.com/" + friendlist.id + "/members", function (response) {
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
					cached_friendlists.push({'id': friendlist.id, 'name': friendlist.name, 'members': members});
				}
				completed++;
				if(completed === friendlists.length) {
					callback(cached_friendlists);
				}
			});
		}
	};

	getFBData("https://graph.facebook.com/me/friendlists", function (friendlists) {
		var arr = [];
		$.each(friendlists.data, function () {
			arr.push(this);
		});
		fetchFriendlists(arr, callback);
	});
};

Broadmask_facebook.prototype.updateFriends = function (callback) {
	getFBData("https://graph.facebook.com/me/friends", function (friends) {
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

	// check localstorage first
	if (!update()) {
		// Re-Fetch all Friendlists and update whenever it returns
		this.updateCache(update);
	}
};
