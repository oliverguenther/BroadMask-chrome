function Broadmask() {

	// Setup API handlers
	this.imgHost = new Broadmask_Picasa();
	this.osn = new Broadmask_Facebook();

	// Handler for NPAPI module
	this.module = null;

	// Register as handler for incoming message requests
	var that = this;
	chrome.extension.onRequest.addListener(
		function (request, sender, sendResponse) {
			if (typeof request !== 'object') {
				return;
			}

			if (request.message === 'decrypt') {
				try {
					var sharemsg = JSON.parse(atob(request.data));
					if (sharemsg.message.links) {
						// Download, decrypt images
						that.handleImages(sharemsg.gid, sharemsg.message.links, function (result) {
							if (result.length > 0) {
								result = {urls: result};
							}
							sendResponse(result);
						});
					}
				} catch (e) {
					console.error("Couldn't parse request payload " + request.data + ". Error was " + e);
				}
			}
		}
	);

}


/**
* Handle new images from API calls or content scripts.
* Unwraps the message and requests images from the imgHost
* @param groupid instance associated to the urls
* @param urls an array of image URLs
* @param callback a function to display/handle the loaded dataURLs
*/
Broadmask.prototype.handleImages = function (groupid, urls, cb) {
	"use strict";
	if (!Array.isArray(urls)) {
		return;
	}

	var processImages = function (array, fn, callback) {
		var completed = 0,
			result = [];
		if (array.length === 0) {
			callback(result); // done immediately
		}
		for(var i = 0, len = array.length; i < len; i++) {
			var src = array[i];
			fn(src, function(dataURL) {
				result.push(dataURL);
				completed++;
				if(completed === array.length) {
					callback(result);
				}
			});
		}
	};

	var that = this;
	processImages(urls, function(src, callback) {
		var fetchfn = that.imgHost.fetchImage.bind(that.imgHost);

		// Get instance descriptor
		var instance = that.module.get_instance_descriptor(groupid);

		if (instance.error) {
			// instance doesn't exist
			cb({error: true, error_msg: "No instance set up with groupid " + groupid});
			return;
		}

		// receiver or shared instane
		// Download image
		fetchfn(src, function (bmp_ct) {
			if (bmp_ct.error || !bmp_ct.success) {
				cb({error: true, error_msg: "Image Download failed:  " + bmp_ct.error});
				return;
			}
			// decrypt content
			var result = that.module.decrypt_b64(groupid, bmp_ct.result, true);
			if (result.plaintext) {
				callback(result.plaintext);
			} else {
				// probably an error, just return it directly
				callback(result);
			}
		});
	}, cb);
};



Broadmask.prototype.asyncLoop = function (array, fn, callback) {
	if(Object.prototype.toString.call(array) !== '[object Array]') {
		return;
	}

	var completed = 0,
	result = [];
	if (array.length === 0) {
		callback(result);
	}
	for(var i = 0, len = array.length; i < len; i++) {
		var src = array[i];
		fn(src, function(res) {
			result.push(res);
			completed++;
			if(completed === array.length) {
				callback(result);
			}
		});
	}
};

/**
* Share the images to the defined group instance
* @param groupid The group instance id
* @param images array of object 
* {src: 'image data url', onprogress: 'onprogress callback function', success: 'success callback', error: 'error callback'}
*/
Broadmask.prototype.shareImages = function (groupid, images) {
	var bm = this;

	var processImage = function (img, processcb) {
		bm.encrypt(groupid, img.src, true, function (ct_wrapped) {
			if (typeof ct_wrapped !== 'object' || !ct_wrapped.ciphertext) {
				img.error("Encryption failed " + (ct_wrapped.error ? ct_wrapped.error_msg : 'with unknown error.'));
			}
			// upload content
			bm.imgHost.uploadImage(ct_wrapped.ciphertext, img.onprogress, function(xhr, url) {
				if (url) {
					img.success(xhr, url);
					processcb(url);
				} else {
					img.error("Upload failed. " + xhr.status);
				}
			});
		});	
	};


	this.asyncLoop(images, processImage, function (urls) {
		var share = {},
		receivers;

		// build url object
		share.gid = groupid;
		share.message = {'links': urls};

		// Get receivers
		receivers = bm.module.get_instance_members(groupid);

		// Share as JSON string, base64 encoded
		bm.osn.shareOnWall(btoa(JSON.stringify(share)), Object.keys(receivers), true, function() {
			console.log("wee");
		});

	});
};


Broadmask.prototype.shareParams = function (groupid, content) {
	"use strict";
	if (!localStorage["system_" + scope]) {
		var system = {},
		sentkeys = [],
		cursent = 0;
		system.scope = scope;
		system.pubkey = public_params;
		system.pubkey_shared = false;
		system.receivers = JSON.stringify(receivers);

		var messages = [];
		for (var i = 0; i < receivers.length; i += 1) {
			var message = {},
			content = {};	

			content.message = privkeys[i];
			content.privacy = {value: 'CUSTOM', friends: 'SOME_FRIENDS', allow: receivers[i]};


			message.body = $.param(content);
			message.relative_url = "me/feed";
			message.method = "POST";
			messages.push(message);
		}

		shareBatch(messages, function(result) {
			console.log(result);
		});

	}
};

/** Send request to encrypt to BMP */
Broadmask.prototype.encrypt = function (groupid, data, asimage, callback) {
	// TODO async
	var cts = this.module.encrypt_b64(groupid, data, asimage);
	callback(cts);
};

/** Send request to unwrap image to BMP */
Broadmask.prototype.decrypt = function (groupid, data, fromimage, callback) {
	// TODO async
	var pts = this.module.decrypt_b64(groupid, data, fromimage);
	callback(cts);
};

Broadmask.prototype.getKeyMap = function (callback) {
	var list = this.module.gpg_associatedKeys();
	callback(list);
}


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
