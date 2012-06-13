function Broadmask_Picasa() {
	"use strict";
	this.oauth = {
		id: "179165421211.apps.googleusercontent.com",
		secret: "Brwb_-o-gmfw89c0RldlGyhQ",
		redirect: "urn:ietf:wg:oauth:2.0:oob",
		scope: encodeURIComponent("https://picasaweb.google.com/data")
	};

	this.bg = chrome.extension.getBackgroundPage();
	this.broadmask = this.bg.broadmask;
	// Request storage with a max of 10mb
	this.storage = new PermaFrost(10);

	// Check auth status
	this.is_authorized(function () {});

}

/*
* Uploads an image to Picasa Webalbums. Assumes a user has been logged in through oauth
* @param message the response from broadmask
* @param file a BMP as string
*
*/
Broadmask_Picasa.prototype.uploadImage = function (b64bmp, progresscb, callback) {
	"use strict";

	var that = this;
	var performUpload = function () {
		// file is the wrapped BMP as string, base64 encoded 
		var file = atob(b64bmp);
		// we need to convert it to a blob
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

		var access_token = JSON.parse(localStorage.oauth_picasa).access_token;
		xhr.setRequestHeader("Authorization", "Bearer " + access_token);
		// set progress handler
		xhr.upload.onprogress = progresscb;

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

	// check auth status
	this.is_authorized(function (authstate) {
		if (authstate) {
			performUpload();
		} else {
			callback("Picasa authorization failure");
		}
	});
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
			that.downloadImage(url, callback);	
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
	var params = "&alt=json&imgmax=d";
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
						callback({success: true, result: base64ArrayBuffer(this.response)});
					} else {
						callback({success: false, error: true, error_msg: "Status was unsuccessful: " +this.status});
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

Broadmask_Picasa.prototype.authorize = function (activeTab, callback) {
	"use strict";
	var that = this;
	var retrieveToken = function (authcode) {
		// Request access token
		$.ajax({
			"type": 'POST',
			"url": "https://accounts.google.com/o/oauth2/token",
			"dataType": "json",
			"data": {
				code: authcode, 
				client_id: that.oauth.id, 
				client_secret: that.oauth.secret,
				redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
				grant_type: "authorization_code"
			}
		}).done(function(tokeninfo) {
			var now = new Date();
			now.setSeconds(now.getSeconds() + tokeninfo.expires_in);
			tokeninfo.expires_in = now.getTime();
			localStorage.oauth_picasa = JSON.stringify(tokeninfo);
		})
		.fail(function(jqXHR, textStatus) { console.error( "Request failed: " + textStatus ); });	
	};

	var grabToken = function () {
		var listener = this;
		chrome.tabs.getAllInWindow(null, function (tabs) {
			for (var i = 0; i < tabs.length; i++) {
				if (tabs[i].title.indexOf("Success code") === 0 && 
				tabs[i].url.indexOf("https://accounts.google.com/o/oauth2/approval") === 0) {

					var title = tabs[i].title;
					var authcode = title.substr(title.indexOf("=") + 1);
					// remove Tab
					chrome.tabs.onUpdated.removeListener(listener);
					chrome.tabs.remove(tabs[i].id);

					// retrieve token
					retrieveToken(authcode);

					// return to previous tab
					chrome.tabs.update(activeTab.id, {active: true});
					chrome.tabs.reload(activeTab.id);
					break;
				}
			}
		});
	};

	chrome.tabs.onUpdated.addListener(grabToken);
	chrome.tabs.create({'url': "https://accounts.google.com/o/oauth2/auth?client_id=" + that.oauth.id + "&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&scope=" + that.oauth.scope});
};

Broadmask_Picasa.prototype.revokeAuth = function () {
	delete localStorage.oauth_picasa;
};

Broadmask_Picasa.prototype.is_authorized = function (callback) {
	var that = this;
	var tokeninfo = {};

	if (!localStorage.oauth_picasa) {
		callback(false);
		return;
	}

	try {
		tokeninfo = JSON.parse(localStorage.oauth_picasa);
	} catch (e) {
		console.warn("Error parsing token. "  + e);
		delete localStorage.oauth_picasa;
		callback(false);
	}

	if (tokeninfo.access_token && tokeninfo.refresh_token) {
		if (new Date(tokeninfo.expires_in).getTime() > new Date().getTime()) {
			callback(true);
		} else {
			// get refresh token
			$.ajax({
				"type": 'POST',
				"url": "https://accounts.google.com/o/oauth2/token",
				"dataType": "json",
				"data": {
					refresh_token: tokeninfo.refresh_token, 
					client_id: that.oauth.id, 
					client_secret: that.oauth.secret,
					grant_type: "refresh_token"
				}
			}).done(function(fresh_token) {
				var now = new Date();
				now.setSeconds(now.getSeconds() + fresh_token.expires_in);
				tokeninfo.expires_in = now.getTime();
				tokeninfo.access_token = fresh_token.access_token;
				localStorage.oauth_picasa = JSON.stringify(tokeninfo);
				callback(true);
			})
			.fail(function(jqXHR, textStatus) { console.error( "Couldn't refresh status" + textStatus ); callback(false); });	
		}
	} else {
		callback(false);
	}
};
