function Broadmask_facebook(d, id) {
	"use strict";
	this.broadmask = chrome.extension.getBackgroundPage().broadmask;
	this.d = d;
	this.images = null;
	this.root = d.getElementById(id);

	var sharef = this.share.bind(this),
	that = this;
	$(d).ready(function () {
		$('#share-submit-btn').click(sharef);
		$('#share-reset-btn').click(function () {
			$("." + that.images).remove();
			$("#share-select").attr("disabled", "disabled");
			$("#share-submit-btn").attr("disabled", "disabled");
			$("#share-reset-btn").attr("disabled", "disabled");
		});
	});

	// fetch friends
	this.fetchFriends();

}

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
		selected = $("#share-select option:selected").val(),
		receivers = this.receiversFromID(selected),
		that = this,
		toupload = [];
	$.each(thumbs, function () {
		that.broadmask.uploadImage(selected, receivers, this.src, function (data) {
			var image = document.createElement("img");
			image.src = "data:image/bmp;base64," + data;
			$("#status").append(image);
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
		this.fetchFriends();
	}
};


Broadmask_facebook.prototype.updateFriendlists = function (callback) {
	"use strict";

	var fetchFriendlistMembers = function (id, callback) {
		getFBData("https://graph.facebook.com/" + id + "/members", function (members) {
			if (Array.isArray(members.data) && members.data.length > 0) {
				localStorage[id] = JSON.stringify(members.data);
			} else {
				console.log('Could not fetch members for friendlist ' + id);
			}
			callback();
		});
	};

	var fetchFriendlists = function (friendlists, callback) {
		var completed = 0;
		if (friendlists.length === 0) {
			callback();
		}
		for(var i = 0, len = friendlists.length; i < len; i++) {
			fetchFriendlistMembers(friendlists[i], function() {
				completed++;
				if(completed === friendlists.length) {
						callback();
				}
			});
		}
	};

	getFBData("https://graph.facebook.com/me/friendlists", function (friendlists) {
		localStorage.friendlists = JSON.stringify(friendlists.data);
		var arr = [];
		$.each(friendlists.data, function () {
			arr.push(this.id);
		});
		fetchFriendlists(arr, callback);
	});
};

/*
 * Build Facebook friendlists to share with
 * Tries to read cached data from localStorage first
 * @param select The select element to output to
 */
Broadmask_facebook.prototype.fetchFriends = function () {
	"use strict";
	// strip select from all existing options
	$(this.shareWith).empty();

	var cached,
		update,
		that = this;
	update = function () {
		if (localStorage.friendlists) {
			var friendlists = JSON.parse(localStorage.friendlists),
				options = [];
			$.each(friendlists, function () {
				// If friendlist has locally stored members
				if (typeof localStorage[this.id] !== "undefined") {
					options.push('<option value="' + this.id + '">' + this.name + '</option>');
				}
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
		this.updateFriendlists(update);
	}
};
