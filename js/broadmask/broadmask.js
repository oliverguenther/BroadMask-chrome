function Broadmask() {

	// Setup API handlers
	this.imgHost = new Broadmask_Picasa(this, chrome.extension.getBackgroundPage().oauth);

	// Handler for NPAPI module
	this.module = null;
	
}


/**
 * Handle new images from API calls or content scripts.
 * Unwraps the message and requests images from the imgHost
 * @param urls an array of image URLs
 * @param callback a function to display/handle the loaded dataURLs
 */
Broadmask.prototype.handleImages = function (urls, cb) {
	"use strict";
	if (!Array.isArray(urls)) {
		return;
	}

	var processImages = function (array, fn, callback) {
		var completed = 0;
		if (array.length === 0) {
			callback(); // done immediately
		}
		for(var i = 0, len = array.length; i < len; i++) {
			var src = array[i];
			fn(src, function(dataURL) {
					chrome.extension.getBackgroundPage().newUnread(src, dataURL);
					completed++;
					if(completed === array.length) {
						callback();
					}
				});
		}
	};

	processImages(urls, this.imgHost.fetchImage.bind(this.imgHost), cb);
};

Broadmask.prototype.uploadImage = function (scope, receivers, dataURL, callback) {
	this.encrypt(scope, receivers, dataURL, true, callback);
};

/** Send request to encrypt to BMP */
Broadmask.prototype.encrypt = function (scope, receivers, data, asimage, callback) {
	// Start sender instance
	this.module.start_sender_instance(scope, 256);
	
	for (var i = 0; i < receivers.length; i += 1) {
		this.module.add_member(scope, receivers[i]);
		var privkey = this.module.get_member_sk(scope, receivers[i]);
		console.log(privkey);
	}
	var cts = this.module.encrypt_b64(scope, receivers, data, asimage);
	callback(atob(cts));
};

/** Send request to unwrap image to BMP */
Broadmask.prototype.decrypt = function (scope, data, fromimage, callback) {
};

/** Called when NPAPI plugin is loaded */
Broadmask.prototype.moduleDidLoad = function () {
	this.module = document.getElementById("broadmask");
};

Broadmask.prototype.moduleValid = function () {
	return (this.module && this.module.valid);
}

Broadmask.prototype.run = function () {
	var listener = document.getElementById("broadmask_listener");

	// Setup NPAPI plugin
	listener.innerHTML = '<object id="broadmask" type="application/x-broadmask" width="0" height="0"><param name="onload" value="pluginLoaded" /></object>';
};
