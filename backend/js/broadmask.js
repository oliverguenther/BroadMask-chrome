function Broadmask() {

	// Setup API handlers
	this.imgHost = new Broadmask_Picasa();
	this.osn = new Broadmask_Facebook();

	// Handler for NPAPI module
	this.module = null;

	// Register as handler for incoming message requests
	var that = this;
	chrome.extension.onConnect.addListener(this.onCSConnection.bind(this));

}



Broadmask.prototype.onCSConnection = function (port) {
	if (port.name !== "fbcontentscript") {
		return;
	}
	var that = this;


	var handleContent = function (message) {
		var bm_msg,
		start = message.indexOf("=== BEGIN BM DATA ===") + 22,
		end = message.indexOf("=== END BM DATA ===") - 23;

		try {
			bm_msg = JSON.parse(atob(message.substr(start, end)));
		} catch (e) {
			console.error("Couldn't extract message from wall post: " + e);
			return;
		}
		if (!bm_msg.hasOwnProperty("data")) {
			port.postMessage({error: true, error_msg: "No message content found in message"});
			console.warn("No message countent found in: " + JSON.stringify(bm_msg));
		}
		if (bm_msg.data.text_message) {
			// Decrypt inline text
			that.decrypt(bm_msg.gid, bm_msg.data.text_message, false, function (result) {
				port.postMessage(result);
			});
		}
		if (bm_msg.data.links) {
			// Download, decrypt images
			that.handleImages(bm_msg.gid, bm_msg.data.links, function (result) {
				if (result.length > 0) {
					result = {urls: result};
				}
				port.postMessage(result);
			});
		} 
		if (!(bm_msg.data.text_message || bm_msg.data.links)) {
			port.postMessage({error: true, error_msg: "Could not detect any messages or links"});
			console.warn("unknown message. " + JSON.stringify(bm_msg));
		}

	};

	var handleKeyTransmission = function (message) {
		try {
			var dec_msg = that.module.gpg_decrypt(message);
			if (typeof dec_msg !== 'object' || !dec_msg.hasOwnProperty("result")) {
				return;
			}
			var msg = JSON.parse(dec_msg.result);
			if (msg.type === "instance") {
				// incoming instance, set it up
				if (msg.instance_type === 1) {
					// receiver instance {pk, sk}
					that.module.create_receiver_instance(msg.id, "receiver", msg.max_users, msg.pk, msg.sk);
					port.postMessage({error:false, plaintext: "Received a BM-BE instance with identifier " + msg.id + ". Added to your groups"});

					//that.osn.message_ack({id: request.id, type: "post"});
				} else if (msg.instance_type === 4) {
					that.module.create_receiver_instance(msg.id, "receiver", msg.max_users, msg.pk, msg.sk);
					port.postMessage({error:false, plaintext: "Received a BM-SK instance with identifier " + msg.id + ". Added to your groups"});
					//that.osn.message_ack({id: request.id, type: "post"});
				} else {
					console.warn("unknown instance type");
				}
			}
		} catch (e) {
			console.log("Couldn't parse message. Error: " + e);
		}
	};

	// handle incoming messages
	port.onMessage.addListener(function (request) {
		if (typeof request !== 'object') {
			return;
		}

		if (!request.hasOwnProperty("id")) {
			return;
		}	

		// fetch UIStreamMessage
		that.osn.getFBData("https://graph.facebook.com/" + request.id, function (response) {
			if (response.error || !response.hasOwnProperty("message")) {
				console.error("Error fetching wall post: " + response.error.message);
				return;
			}
			var fbmsg = response.message;
			if (request.type === 'broadmask') {
				handleContent(response.message);
			} else if (request.type === 'pgp') {
				handleKeyTransmission(response.message);
			}
		});
	});
};


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
		error = false,
		result = [];
		if (array.length === 0) {
			callback(result); // done immediately
		}
		for(var i = 0, len = array.length; error == false && i < len; i++) {
			var src = array[i];
			fn(src, function(response) {
				if (response.error) {
					callback(response);
					error = true;
				} else if (response.content) {
					result.push(response.content);
					completed++;
					if(completed === array.length) {
						callback(result);
					}
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
			callback({error: true, error_msg: "No instance set up with groupid " + groupid});
			return;
		}

		// receiver or shared instane
		// Download image
		fetchfn(src, function (bmp_ct) {
			if (bmp_ct.error || !bmp_ct.success) {
				callback({error: false, warning: true, warn_msg: "Image Download failed:  " + bmp_ct.error});
				return;
			}
			// decrypt content
			var result = that.module.decrypt_b64(groupid, bmp_ct.result, true);
			if (result.plaintext) {
				callback({error:false, content: result.plaintext});
			} else {
				// probably an error, just return it directly
				callback({error:true, error_msg: result});
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
* Share a message (containing plaintext or/and media) to the given group instance
* @param groupid The group instance id
* @param message an object containing 'plaintext' key for raw text, or an array of image objects with the following structure
* {src: 'image data url', onprogress: 'onprogress callback function', success: 'success callback', error: 'error callback'}
*/
Broadmask.prototype.share = function (groupid, message) {
	var bm = this;

	var processImage = function (img, processcb) {
		bm.encrypt(groupid, img.src, true, function (ct_wrapped) {
			if (typeof ct_wrapped !== 'object' || !ct_wrapped.ciphertext) {
				img.error("Encryption failed " + (ct_wrapped.error ? ct_wrapped.error_msg : 'with unknown error.'));
				return;
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

	var encryptText = function(message, callback) {
		bm.encrypt(groupid, message.plaintext, false, function (result) {
			if (typeof result !== 'object' || !result.ciphertext) {
				error("Encryption failed " + (result.error ? result.error_msg : 'with unknown error.'));
			} else {
				callback(result.ciphertext);
			}
		});
	};

	var encryptMedia = function(message, callback) {
		bm.asyncLoop(message.media, processImage, callback);
	}

	var shareMessage = function(share) {
		// Get receivers
		// var receivers = bm.module.get_instance_members(groupid);

		// Share as JSON string, base64 encoded
		bm.osn.shareOnWall(btoa(JSON.stringify(share)), [], true);
	};

	// Prepare shared message
	var share = {};
	share.gid = groupid;
	share.data = {};

	var hasText = message.hasOwnProperty("plaintext"),
	hasMedia = (message.hasOwnProperty("media") && Array.isArray(message.media));

	if (hasText) {
		// Encrypt plaintext
		encryptText(message, function (ct) {
			share.data.text_message = ct;

			// Additionally encrypt media
			if (hasMedia) {
				encryptMedia(message, function (urls) {
					share.data.links = urls;

					shareMessage(share);
				});
			} else {
				// share directly
				shareMessage(share);
			}

		});
	} else {
		if (hasMedia) {
			encryptMedia(message, function (urls) {
				share.data.links = urls;

				shareMessage(share);
			});
		}
	}
};

Broadmask.prototype.encrypt = function (groupid, data, asimage, callback) {
	// TODO async
	var cts = this.module.encrypt_b64(groupid, data, asimage);
	callback(cts);
};

Broadmask.prototype.armorData = function (message) {
	"use strict";
	var d = [];
	d.push("=== BEGIN BM DATA ===");
	d.push(message);
	d.push("=== END BM DATA ===");
	d.push("This message has been encrypted using Broadmask");
	return d.join("\n");
};

/** Send request to unwrap image to BMP */
Broadmask.prototype.decrypt = function (groupid, data, fromimage, callback) {
	// TODO async
	var pts = this.module.decrypt_b64(groupid, data, fromimage);
	callback(pts);
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
