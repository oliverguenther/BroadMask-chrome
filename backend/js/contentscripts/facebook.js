// Replace selection for text encryption
function replaceSelection(newdata) {
	"use strict";
	var sel, range, node;

	if (typeof window.getSelection !== "undefined") {
		sel = window.getSelection();

		// select the textfield
		var textfield = sel.focusNode.firstElementChild;
		textfield.value = newdata;
	}
}

chrome.extension.onRequest.addListener(function (request, sender, responseCallback) {
	if (request.message === "replaceSelection") {
		replaceSelection(request.content);
	}
});


// Search for BM IDs in Stream Messages
var handleMessage = function (streamElement, message) {
	"use strict";
	var port = chrome.extension.connect({name: "fbcontentscript"});
	port.postMessage(message);

	port.onMessage.addListener(function (response) {
		if (typeof response === 'object') {
			// remove child nodes if no content was added yet
			if (!streamElement.getAttribute("bm-injected")) {
				while (streamElement.hasChildNodes()) {
					streamElement.removeChild(streamElement.lastChild);
				}
			}

			// check response for data
			if (response.urls) {
				// data urls, display them
				for (var i = 0, len = response.urls.length; i < len; i += 1) {
					if (response.urls[i].indexOf("data:image/") !== -1) {
						// display as image
						var img = document.createElement("img"),
							full = document.createElement("a");
						img.src = response.urls[i];
						full.href = response.urls[i];
						img.style.width = "150px";
						img.style.border = "1px solid #ccc";
						img.style.padding = "5px";
						full.appendChild(img);
						streamElement.appendChild(full);
					} else {
						// Display as link
						// Extract data url
						var mimeTypeEnd = response.urls[i].indexOf(";"),
						mimetype = response.urls[i].substr(0, mimeTypeEnd),
						fullwrap = document.createElement("p"),
						full = document.createElement("a");
						full.href = response.urls[i];
						full.innerText = "Click to view content (Mimetype: " + mimetype + ").";
						fullwrap.appendChild(full);
						streamElement.appendChild(fullwrap);
					}
					streamElement.setAttribute("bm-injected", true);
				}
			} else if (response.plaintext) {
				
				var textnode = document.createElement("p");
				textnode.innerText = response.plaintext.split("\n").join("<br/>");
				// Make textnode appear on top
				if (streamElement.firstChild) {
					streamElement.insertBefore(textnode, streamElement.firstChild);
				}
				streamElement.appendChild(textnode);
				streamElement.setAttribute("bm-injected", true);
			} else if (response.error) {
				var errnode = document.createElement("p");
				errnode.innerText = response.error_msg.split("\n").join("<br/>");
				streamElement.appendChild(errnode);
				streamElement.setAttribute("bm-injected", true);
			}
		}
	});
};

var refresh = function () {
	"use strict";
	var bmtag, pgptag, it, story_data, mb, bm_message,
	stories = document.getElementsByClassName("uiStreamStory");
	
	for (var i = 0, len = stories.length; i < len; i++) {
		try {
		var story_input = stories[i].querySelector("form.commentable_item")[2].getAttribute("value");
		story_data = JSON.parse(story_input);
		} catch (e) { /* no story exists to be parsed */ continue; }
		// skip all posts not created by our app
		// if (story_data.source_app_id !== "281109321931593") {
		// 	return;
		// }
		mb = stories[i].getElementsByClassName("messageBody")[0];

		if (mb) {
			it = mb.innerText;
			if (it !== null && it !== 'undefined') {
				// check for broadmask post
				bmtag = it.indexOf('=== BEGIN BM DATA ===');
				// check for GPG post
				pgptag = it.indexOf('-----BEGIN PGP MESSAGE-----');
				bm_message = {id: story_data.target_fbid};
				if (bmtag !== -1) {
					bm_message.type = "broadmask";
				} else if (pgptag !== -1) {
					bm_message.type = "pgp";
				}
				handleMessage(mb, bm_message);
			}
		}
	}
};

window.setTimeout("refresh()", 0);
