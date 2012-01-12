function Broadmask_Picasa(oauth) {
	this.oauth = oauth;

}


/*
* Uploads an image to Picasa Webalbums. Assumes a user has been logged in through oauth
* @param message the response from broadmask
* @param file a BMP as string
*
*/
Broadmask_Picasa.prototype.uploadImage = function (file, progress, callback) {
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

Broadmask_Picasa.prototype.performAuth = function () {
	this.oauth.authorize(function () {
		// Auth successful / Token in storage
		show_uploadform();
	});
}

Broadmask_Picasa.prototype.revokeAuth = function () {
	this.oauth.clearTokens();
	location.reload(true);
};
