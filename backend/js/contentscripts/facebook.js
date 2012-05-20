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
	chrome.extension.sendRequest(message, function (response) {
		if (typeof response === 'object') {
			// remove child nodes
			while (streamElement.hasChildNodes()) {
				streamElement.removeChild(streamElement.lastChild);
			}
			if (response.urls) {
				// image urls, display them
				for (var i = 0, len = response.urls.length; i < len; i += 1) {
					var img = document.createElement("img"),
						full = document.createElement("a");
					img.src = response.urls[i];
					full.href = response.urls[i];
					img.style.width = "150px";
					img.style.border = "1px solid #ccc";
					img.style.padding = "5px";

					full.appendChild(img);
					streamElement.appendChild(full);

				}
			} else if (response.plaintext) {
				streamElement.innerHTML = "<p>" + response.plaintext.split("\n").join("<br/>") + "</p>";
			} else if (response.error) {
					streamElement.innerHTML = "<p>" +  response.error_msg.split("\n").join("<br/>") + "</p>";
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
		} catch (e) {
			console.error("Couldn't fetch attributes for ui stream story");
		}
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
