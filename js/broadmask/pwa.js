function on_image_sent(response, xhr) {
	$("#Picasa-Uplaod").prepend("<p>Das Bild wurde erfolgreich hochgeladen!<br/> " + response + "</p>");
}

function construct_multipart(title, description, image, mimetype) {
	var multipart = ['Media multipart posting', "	\n", '--END_OF_PART', "\n",
		'Content-Type: application/atom+xml',"\n","\n",
		"<entry xmlns='http://www.w3.org/2005/Atom'>", '<title>', title, '</title>',
		'<summary>', description, '</summary>',
		'<category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/photos/2007#photo" />',
		'</entry>', "\n", '--END_OF_PART', "\n",
		'Content-Type:', mimetype, "\n\n",
		image, "\n", '--END_OF_PART--'];
	return multipart.join("");
}

// Multipart DOES NOT WORK
function image_to_albumid(file,albumid) {
	var oauth = chrome.extension.getBackgroundPage().oauth;
	var method = 'POST';
	var url = 'https://picasaweb.google.com/data/feed/api/user/default/albumid/' + albumid;
	var reader = new FileReader();
	reader.onload = (function(theFile) {
		return function(e) {
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
	})(file);
	reader.readAsText(file);
}

function add_single_image_to_albumid(file, albumid) {

	var oauth = chrome.extension.getBackgroundPage().oauth;
	var method = 'POST';
	var url = 'https://picasaweb.google.com/data/feed/api/user/default/albumid/' + albumid;
	var xhr = new XMLHttpRequest();
	xhr.open(method, url, true);
	xhr.setRequestHeader("GData-Version", '3.0');
	xhr.setRequestHeader("Content-Type", file.type);
	xhr.setRequestHeader("Authorization", oauth.getAuthorizationHeader(url, method, ''));
	xhr.onreadystatechange = function(data) {
		if (xhr.readyState == 4) {
			on_image_sent(data, xhr);
		}
	};
	xhr.send(file);
}	



function handleFiles(files) {
	// Loop through the FileList and render image files as thumbnails.
	for (var i = 0, f; f = files[i]; i++) {

		// Only process image files.
		if (!f.type.match('image.*')) {
			continue;
		}

		//add_single_image_to_albumid(f, '5676821079988873841');
		var reader = new FileReader();
		reader.onload = (function(theFile) {
			return function(e) {
				var imageurl = e.target.result;
				broadmask.nacl.wrapImage(imageurl.substring(5), false); // remove "data:"
			};
		})(file);
		reader.readAsDataURL(f);
	}
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


function gAuth() {
	var oauth = chrome.extension.getBackgroundPage().oauth;
	oauth.authorize(function() {
		// Auth successfull / Token in storage
		show_uploadform();
	});
}

function gLogout() {
	var oauth = chrome.extension.getBackgroundPage().oauth;
	oauth.clearTokens();
	location.reload(true);
};
