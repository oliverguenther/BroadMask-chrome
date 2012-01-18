function Broadmask_facebook(d, id) {
	"use strict";
	this.broadmask = chrome.extension.getBackgroundPage().broadmask;
	this.d = d;
	this.images = null;
	this.root = d.getElementById(id);

	// Hide by default
	$(this.root).hide();

	this.shareBtn = d.createElement('button');
	this.shareWith = d.createElement('select');
	this.wrapper = d.createElement('div');

	this.shareBtn.className = "btn primary";
	this.shareBtn.id = "shareBtn";
	this.shareBtn.innerText = "Share now"; // i18n
	var sharef = this.share.bind(this);
	$(d).ready(function () {
		$('#shareBtn').click(sharef);
	});

	this.wrapper.appendChild(this.shareWith);
	this.wrapper.appendChild(this.shareBtn);
	this.root.appendChild(this.wrapper);
	
	this.showShare = function () {
		$(this.root).show();
	};

	// fetch friends
	this.fetchFriends();

}

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
		toupload = [];
	$.each(thumbs, function () {
		var target = $(this).attr('rel');
		if (target !== null && target !== undefined) {
			toupload.push(target);
		}
	});

	if (toupload.length > 0) {
		shareOnWall(this.armorData(toupload), [this.shareWith.value]);
	} else {
		// Nothing to share?
		console.log("Facebook share received no thumbs to share!");
	}

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
		this.showShare();
	}
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
		var friendlists = JSON.parse(localStorage.friendlists),
			options = [];
		if (typeof friendlists !== "undefined") {
			$.each(friendlists, function () {
				// If friendlist has locally stored members
				if (typeof localStorage[this.id] !== "undefined") {
					options.push('<option value="' + this.id + '">' + this.name + '</option>');
				}
			});
		}
		if (options.length > 0) {
			$(that.shareWith).append(options.join(''));
			return true;
		}
		return false;
	};

	// check localstorage first
	if (!update()) {
		// Re-Fetch all Friendlists and update whenever it returns
		fetchFriendlists(update);
	}
};
