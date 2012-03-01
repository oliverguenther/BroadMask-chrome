function Broadmask_nacl() {
	"use strict";
	this.SRPC_MAXLEN = 65000; // max length is 65228

	// Setup API handlers
	this.imgHost = new Broadmask_Picasa(this, chrome.extension.getBackgroundPage().oauth);
	// this.osn = new Broadmask_facebook();

	// Setup crypto implementations
	// this.shared = new Broadmask_aes();
	// this.broadcast = new Broadmask_be();

	// Handler for native client module
	this.module = null;

	// Handle callbacks for messages
	this.cb = {};

	this.parseMethod = function parseMethod(data) {
		if (!data || typeof data !== 'string') {
			return null;
		}
		var call = {};
		var offset = data.indexOf(" ");
		if (offset === -1) {
			return null; // couldn't parse method name
		}
		call.name = data.substr(0, offset);
		// get data offset
		var doffset = data.indexOf("data:");
		if (doffset !== -1) {
			// extract data
			call.data = data.slice(doffset + 5);
		}
		doffset = doffset !== -1 ? doffset : data.length;
		var params = data.slice(offset, doffset).trim();
		// parse parameters
		var regex = /(\w+):(\w+)/g;
		var matches;
		while ((matches = regex.exec(params))) {
			call[matches[1]] = matches[2];
		}

		if (!call.hasOwnProperty('uid')) {
			console.log("Error: Call method didn't have uid " + call);
			return null;
		}

		return call;

	};
}

/**
 * Handle new images from API calls or content scripts.
 * Unwraps the message and requests images from the imgHost
 * @param urls an array of image URLs
 * @param callback a function to display/handle the loaded dataURLs
 */
Broadmask_nacl.prototype.handleImages = function (urls, cb) {
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

	processImages(urls, this.imgHost.fetchImage.bind(this.imgHost), function () {
		cb();
	});

};

/** Handle an incoming message from Broadmask code */
Broadmask_nacl.prototype.handleMessage = function (message_event) {
	var message = this.parseMethod(message_event.data);
	var callback;
	if (message === null || typeof message !== 'object') {
		return;
	}
	callback = this.cb[message.uid];

	if (callback === null || typeof callback !== 'function') {
		console.log("Received message with no callback! " + message);
		return;
	}
	callback(message);
};

Broadmask_nacl.prototype.sendMessage = function (message, callback) {
	if (this.module === null) {
		console.log("Error: Can't send message as module was not loaded! ");
	}
	if (callback !== null && typeof callback === 'function' && typeof message === 'object' && message.hasOwnProperty("name")) {
		var uid = Math.round(Math.random() * 1024);
		message.uid = uid;
		this.cb[uid] = callback;
		this.module.postMessage(message.name + " uid:" + uid + "	data:" + message.data);
	} else {
		console.log("Invalid callback/message " + message);
	}
};

Broadmask_nacl.prototype.moduleDidLoad = function () {
	this.module = document.getElementById("broadmask");
	this.module.addEventListener('message', this.handleMessage.bind(this), false);
};

/** Send request to wrap image to BMP */
Broadmask_nacl.prototype.wrapImage = function (image, callback) {
	var message = {
		name: "wrapImage",
		data: image
	};
	this.sendMessage(message, callback);
};

/** Send request to unwrap image to BMP */
Broadmask_nacl.prototype.unwrapImage = function (image, callback) {
	var message = {
		name: "unwrapImage",
		data: btoa(image)
	};
	this.sendMessage(message, callback);
};


Broadmask_nacl.prototype.run = function () {
	var listener = document.getElementById("broadmask_listener");

	// Attach message listener to the surrounding div, but call with reference to this object
	listener.addEventListener('load', this.moduleDidLoad.bind(this), true);

	// Setup nacl
	listener.innerHTML = '<embed id="broadmask"' +
		' src=broadmask/broadmask.nmf ' +
		'type="application/x-nacl" ' +
		'width="480" height="480" />';
};
