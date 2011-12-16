function Broadmask_nacl() {

	this.SRPC_MAXLEN = 65000; // max length is 65228

	// Handler for native client module
	this.module = null;

	// Module status
	this.running = false;

	// privileged method
	this.parseMethod = function parseMethod(data) {
		if (!data || typeof data !== 'string') {
			return null;
		}
		var call = {};
		var offset = data.indexOf(" ");
		if (offset === -1) {
			return null; // couldn't parse method name
		}
		call.methodName = data.substr(0, offset);
		// get data offset
		var doffset = data.indexOf("data:");
		if (doffset !== -1) {
			// extract data
			call.data = data.slice(doffset + 5);
		}
		doffset = doffset || data.length - 1;
		var params = data.slice(offset, doffset).trim();
		// parse parameters
		var regex = /(\w+):(\w+)/g;
		var matches;
		while ((matches = regex.exec(params))) {
			call[matches[1]] = matches[2];
		}


		return call;

	};



};

/** Handle an incoming message from Broadmask code */
Broadmask_nacl.prototype.handleMessage = function (message_event) {
	var message = this.parseMethod(message_event.data);
	console.log(message_event.data.length);
};

Broadmask_nacl.prototype.moduleDidLoad = function () {
	this.module = document.getElementById("broadmask");
	this.running = true;
	this.module.addEventListener('message', this.handleMessage.bind(this), false);
};

/** Send request to wrap image to BMP */
Broadmask_nacl.prototype.wrapImage = function (image, callback) {
	var uid = Math.round(Math.random() * 1024);
	if (callback && typeof callback === 'function') {
		msgcallback[uid] = callback;
	}
	if (this.module) {
		// split messages if necessary (SRPC BUG)
		if (image.length > this.SRPC_MAXLEN) {
			console.log("Image size is " + image.length + " , needs to be split");
			var packetid = 0;
			while ((image.length % this.SRPC_MAXLEN) !== 0) {
				var packet = image.substr(0, this.SRPC_MAXLEN);
				image = image.substring(this.SRPC_MAXLEN);
				this.module.postMessage("handlePacket uid:" + uid + "		part:" + packetid + "		data:" + packet);
				packetid++;
			}
			if (image.length > 0) {
				// Send last packet, marked by negative id
				console.log("Sending last packet after " + packet + "		packets");
				packet = '-1';
				this.module.postMessage("handlePacket uid:" + uid + "		part:" + packetid + "		data:" + image);
			}
		} else {
			// Image is smaller than SRPC maxlen, send as one packet
			this.module.postMessage("wrapImage uid: " + uid + "		data:" + image);
		}
		// Tell Broadmask to wrap the image
		this.module.postMessage("wrapImage uid:" + uid);
	} else {
		console.log("Error: Can't wrap image as module was not loaded! Status is " + statusText);
	}
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
