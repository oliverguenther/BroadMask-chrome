function Broadmask_Picasa(broadmask, oauth) {
	"use strict";
	this.oauth = oauth;
	this.broadmask = broadmask;
	// Request storage with a max of 50mb
	this.storage = new PermaFrost(10);

}

/*
* Uploads an image to Picasa Webalbums. Assumes a user has been logged in through oauth
* @param message the response from broadmask
* @param file a BMP as string
*
*/
Broadmask_Picasa.prototype.uploadImage = function (file, progress, callback) {
	"use strict";
	// file is the wrapped BMP as string, 
	// we need to convert it to a blob - which is just a bit ugly
	var bb = new window.WebKitBlobBuilder();
	var byteArray = new Uint8Array(file.length);
	for (var i = 0, len = file.length; i < len; i++) {
		byteArray[i] = file.charCodeAt(i) & 0xff;
	}

	var builder = new (window.BlobBuilder || window.WebKitBlobBuilder)();
	builder.append(byteArray.buffer);
	var bmp = builder.getBlob("image/bmp");
	var method = 'POST';
	// TODO upload to default album - create album per friendlist instead
	var url = 'https://picasaweb.google.com/data/feed/api/user/default/albumid/default';
	var xhr = new XMLHttpRequest();
	xhr.open(method, url, true);
	xhr.setRequestHeader("GData-Version", '3.0');
	xhr.setRequestHeader("Content-Type", "image/bmp");
	xhr.setRequestHeader("Authorization", this.oauth.getAuthorizationHeader(url, method, ''));
	// set progress handler
	xhr.upload.onprogress = function(e) {
		if (e.lengthComputable && progress !== null ) {
			progress.value = (e.loaded / e.total) * 100;
		}
	};

	var that = this;
	xhr.onreadystatechange = function (data) {
		if (xhr.readyState === 4) {
			var url = xhr.getResponseHeader("Content-Location");
			if (xhr.status === 201 && url != null) {
				callback(xhr.status, url);
			} else {
				callback(xhr.status);
			}
		}
	};
	xhr.send(bmp);
};

/**
 * Unwrap an image
 * @param blob An image wrapped in image/bmp as a blob
 * @callback called with the returned dataURL
 */
Broadmask_Picasa.prototype.unwrapFromBlob = function (blob, callback) {
	"use strict";
	var reader = new FileReader();
	var broadmask = this.broadmask;
	// Only process image files.
	reader.onload = (function (theFile) {
		return function (e) {
			broadmask.unwrapImage(e.target.result, function (message) {
				callback(message.data);
			});
		};
	})(blob);
	reader.readAsBinaryString(blob);

};

/** 
* INTERNAL
* Retrieve an image, either from local cache or from Picasa.
* @param url The url to an picasa entry
* @callback Called with downloaded / cached dataURL
*/
Broadmask_Picasa.prototype.fetchImage = function (url, callback) {
	"use strict";
	var storage = this.storage,
		that = this;
	storage.get(url, function (pval) {
		if (pval && 0) { 
			console.log("cache hit!");
			callback(pval); 
		} else { 
			console.log("Downloading... " + url);
			that.downloadImage(url, function (dataURL) {
				// Cache image for next time
				console.log("Got " + url);
				storage.store(url, dataURL);
				callback(dataURL);
			}); 
		}
	});
};


/** 
* INTERNAL
* Download an image from Picasa.
* @param url The url to an picasa entry
* @callback Called with downloaded dataURL
*/
Broadmask_Picasa.prototype.downloadImage = function (url, callback) {
	"use strict";
	var params = "?alt=json&imgmax=d";
	var xhr = new XMLHttpRequest();
	var that = this;
	xhr.open("GET", url + params, true);
	xhr.onreadystatechange = function (data) {
		if (xhr.readyState === 4) {
			var answerset = JSON.parse(xhr.response);
			if (typeof answerset === "object" && answerset.hasOwnProperty("entry")) {
				// Retrive entry data url
				var content = answerset.entry.content;
				var fetch = new XMLHttpRequest();
				fetch.open('GET', content.src, true);
				fetch.responseType = 'arraybuffer';

				fetch.onload = function(e) {
					if (this.status == 200) {
						var bb = new window.WebKitBlobBuilder();
						bb.append(this.response);
						var blob = bb.getBlob(content.type);
						that.unwrapFromBlob(blob, function (dataURL) { callback(atob(dataURL)); }); 
					}
				}
				fetch.send();
			}
		}
	};

	xhr.send();

};

/*
* Handles a response from Picasa. Extracts the uploaded image on success
* and reports errors otherwise
* @param response the JSON response from picasa
* @param xhr the XHR object for tracing
*/
Broadmask_Picasa.prototype.handleResponse = function (xhr) {
	if (xhr == null) {
		error("Error handling Picasas response: XHR was null");
		return;
	}
	if (xhr.status !== 201) {
		error("Image upload was unsuccessful" + xhr.statusText);
	}

	// Image link is returned in content-location response header
	var imagelink = xhr.getResponseHeader('content-location');
	if (imagelink != null) {
		debug("Imagelink is: " + imagelink);
	} else {
		error("Content-Location header was empty! XHR status was " + xhr.status);
	}

};

Broadmask_Picasa.prototype.performAuth = function (callback) {
	this.oauth.authorize(callback);
};

Broadmask_Picasa.prototype.revokeAuth = function (callback) {
	this.oauth.clearTokens();
	callback();
};
