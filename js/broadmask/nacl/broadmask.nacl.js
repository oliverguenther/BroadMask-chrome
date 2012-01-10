function Broadmask_nacl() {

	this.SRPC_MAXLEN = 65000; // max length is 65228

	// Setup API handlers
	this.imgHost = new Broadmask_Picasa(chrome.extension.getBackgroundPage().oauth);
	// this.osn = new Broadmask_facebook();

	// Setup crypto implementations
	// this.shared = new Broadmask_aes();
	// this.broadcast = new Broadmask_be();

	// Handler for native client module
	this.module = null;

	// Handle callbacks for messages
	this.cb = {};
	// Array per uid for split packets
	this.packets = {};

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

/** Handle an incoming message from Broadmask code */
Broadmask_nacl.prototype.handleMessage = function (message_event) {
	var message = this.parseMethod(message_event.data);
	var callback;
	var data;
	if (message === null || typeof message !== 'object') {
		return;
	}
	callback = this.cb[message.uid];

	if (callback === null || typeof callback !== 'function') {
		console.log("Received message with no callback! " + message);
		return;
	}

	// Check if it's a split message
	if (message.hasOwnProperty("packetid") && message.hasOwnProperty("data")) {
		if (message.packetid === "0") {
			// first packet, init packet store
			this.packets[message.uid] = [];
		}
		console.log("Arriving packet " + message.packetid + " for uid " + message.uid);
		this.packets[message.uid].push(message.data);
	} else if (message.hasOwnProperty("data")) {
		console.log("Calling callback directly!");
		callback(message, message.data);
	} else {
		if (typeof this.packets[message.uid] !== null) {
			console.log("calling callback with packets");
			data = atob(this.packets[message.uid].join(""));
			callback(message, data);
		} else {
			console.log("Calling callback without anything");
			callback(message);
		}
	}


};

Broadmask_nacl.prototype.sendMessage = function (message, callback) {
	if (this.module === null) {
		console.log("Error: Can't send message as module was not loaded! ");
	}
	if (callback !== null && typeof callback === 'function' && typeof message === 'object' && message.hasOwnProperty("name")) {
		var uid = Math.round(Math.random() * 1024);
		message.uid = uid;
		this.cb[uid] = callback;
		// var data = btoa(message.data);
		var data = message.data;
		// split messages if necessary (SRPC BUG)
		if (data.length > this.SRPC_MAXLEN) {
			console.log("data size is " + data.length + " , needs to be split");
			var packetid = 0;
			while ((data.length % this.SRPC_MAXLEN) !== 0) {
				var packet = data.substr(0, this.SRPC_MAXLEN);
				data = data.substring(this.SRPC_MAXLEN);
				this.module.postMessage("handlePacket uid:" + uid + " part:" + packetid + " data:" + packet);
				packetid++;
			}
			if (data.length > 0) {
				this.module.postMessage("handlePacket uid:" + uid + " part:" + packetid + " data:" + packet);
			}
			this.module.postMessage(message.name + " uid:" + uid);
		} else {
			// Send directly
			this.module.postMessage(message.name + " uid:" + uid + "	data:" + data);
		}
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
