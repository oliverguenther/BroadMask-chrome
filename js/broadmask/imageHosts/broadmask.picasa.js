function Broadmask_Picasa(oauth) {
	this.oauth = oauth;

}


Broadmask_Picasa.prototype.handleFiles = function (files) {
	// Loop through the FileList and render image files as thumbnails.
	for (var i = 0, f; f = files[i]; i++) {

		// Only process image files.
		if (!f.type.match('image.*')) {
			continue;
		}

		var reader = new FileReader();
		// bind the callback to this context
		var callback = this.uploadImage.bind(this);
		reader.onload = (function(theFile) {
			return function(e) {
				var image = e.target.result;
				broadmask.wrapImage(image, callback);
			};
		})(f);
		reader.readAsDataURL(f);
	}
}

/*
 * Uploads an image to Picasa Webalbums. Assumes a user has been logged in through oauth
 * @param message the response from broadmask
 * @param file a BMP as string
 *
 */
Broadmask_Picasa.prototype.uploadImage = function (message, file) {
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
	var that = this;
	xhr.onreadystatechange = function (data) {
		if (xhr.readyState === 4) {
			that.handleResponse(xhr);
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
