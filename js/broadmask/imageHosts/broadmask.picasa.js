function Broadmask_Picasa(oauth) {
	this.oauth = oauth;


	// TODO Picasa rejects multipart
	this.construct_multipart = function (title, description, image, mimetype) {
		var multipart = ['Media multipart posting', "	\n", '--END_OF_PART', "\n",
			'Content-Type: application/atom+xml', "\n", "\n",
			"<entry xmlns='http://www.w3.org/2005/Atom'>", '<title>', title, '</title>',
			'<summary>', description, '</summary>',
			'<category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/photos/2007#photo" />',
			'</entry>', "\n", '--END_OF_PART', "\n",
			'Content-Type:', mimetype, "\n\n",
			image, "\n", '--END_OF_PART--'];
			return multipart.join("");
	};

	this.uploadMultiPart = function (file, albumid) {
		var oauth = chrome.extension.getBackgroundPage().oauth;
		var method = 'POST';
		var url = 'https://picasaweb.google.com/data/feed/api/user/default/albumid/' + albumid;
		var reader = new FileReader();
		reader.onload = (function (theFile) {
			return function (e) {
				var text = e.target.result;
				var request = construct_multipart('title', 'testphoto', text, file.type);
				var params = {
					"method" : "POST",
					"headers" : {
						"GData-Version": "3.0",
						"Content-Type": "multipart/related; boundary=END_OF_PART",
						"MIME-version": "1.0"
					},
					"body" : request
				};
				oauth.sendSignedRequest(
					url,
					on_image_sent,
					params
				);
			};
		}(file));
		reader.readAsDataURL(file);
	}


}


// TODO move to implementation
/*
function on_image_sent(response, xhr) {
$("#Picasa-Uplaod").prepend("<p>Das Bild wurde erfolgreich hochgeladen!<br/> " + response + "</p>");
}



function handleFileSelect(evt) {
evt.stopPropagation();
evt.preventDefault();

var files = evt.target.files;
handleFiles(files);
}	

function handleFileDrop(evt) {
evt.stopPropagation();
evt.preventDefault();

var files = evt.dataTransfer.files;
handleFiles(files);
}

function handleDragOver(evt) {
evt.stopPropagation();
evt.preventDefault();
}
*/


Broadmask_Picasa.prototype.handleFiles = function (files) {
	// Loop through the FileList and render image files as thumbnails.
	for (var i = 0, f; f = files[i]; i++) {

		// Only process image files.
		if (!f.type.match('image.*')) {
			continue;
		}

		var reader = new FileReader();
		// reference to this for async methods
		var callback = this.uploadImage;
		reader.onload = (function(theFile) {
			return function(e) {
				var image = e.target.result;
				broadmask.wrapImage(image, callback);
			};
		})(f);
		reader.readAsDataURL(f);
	}
}

Broadmask_Picasa.prototype.uploadImage = function (message, file) {
	// file is the wrapped BMP as string, 
	// we need to convert it to a blob - which is just a bit ugly
	var bb = new window.WebKitBlobBuilder();
	var byteArray = new Uint8Array(file.length);
	for (var i = 0, len = file.length; i < len; i++) {
		byteArray[i] = file.charCodeAt(i) & 0xff;
		console.log(byteArray[i]);
	}

	var builder = new (window.BlobBuilder || window.WebKitBlobBuilder)();
	builder.append(byteArray.buffer);
	var bmp = builder.getBlob("image/bmp");
	var method = 'POST';
	var url = 'https://picasaweb.google.com/data/feed/api/user/default/albumid/default';
	var xhr = new XMLHttpRequest();
	xhr.open(method, url, true);
	xhr.setRequestHeader("GData-Version", '3.0');
	xhr.setRequestHeader("Content-Type", "image/bmp");
	xhr.setRequestHeader("Authorization", this.oauth.getAuthorizationHeader(url, method, ''));
	xhr.onreadystatechange = function (data) {
		if (xhr.readyState === 4) {
			// imageUploaded(data, xhr);
		}
	};
	xhr.send(bmp);
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
