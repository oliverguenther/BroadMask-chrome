(function () {

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
function handleMessage (streamElement, message) {
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

			// mark as injected
			streamElement.setAttribute("bm-injected", true);
			

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
				}
			} else if (response.plaintext) {
				
				var textnode = document.createElement("p");
				textnode.innerText = response.plaintext.split("\n").join("<br/>");
				// Make textnode appear on top
				if (streamElement.firstChild) {
					streamElement.insertBefore(textnode, streamElement.firstChild);
				}
				streamElement.appendChild(textnode);
			} else if (response.error) {
				var errnode = document.createElement("p");
				errnode.innerText = response.error_msg.split("\n").join("<br/>");
				streamElement.appendChild(errnode);
			}
		}
	});
};

function parseStreamMessage(mb, post_id) {
		if (!mb || mb.hasAttribute("bm-injected")) {
			return;
		}

		var it = mb.innerHTML;
		if (it !== null && typeof it !== 'undefined') {
			// check for broadmask post
			bmtag = it.indexOf('=== BEGIN BM DATA ===');
			// check for GPG post
			pgptag = it.indexOf('-----BEGIN PGP MESSAGE-----');
			bm_message = {id: post_id};
			if (bmtag !== -1) {
				bm_message.type = "broadmask";
				handleMessage(mb, bm_message);
			} else if (pgptag !== -1) {
				bm_message.type = "pgp";
				// set message as handled
				mb.setAttribute("bm-injected", true);
				handleMessage(mb, bm_message);
			}
		}
}

function parseTimelineProfile() {
	console.debug("parseTimelineProfile");
	var bmtag, pgptag, it, story_data, mb, bm_message,
	stories = document.getElementsByClassName("timelineUnitContainer");

	for (var i = 0, len = stories.length; i < len; i++) {
		try {
		var full_link = stories[i].querySelector("a.uiLinkSubtle");
		if (!full_link) { /* no user posted story */ continue; }
		// Split on full url ?story_fbid=(wanted_id)&id=(actor_id)
		var post_id = full_link.href.match(/=(\d+)&id/)[1];
		} catch (e) {
			// no story exists to be parsed
			console.debug("Exception " + e + " in content " + full_link.href);
			continue;
		}
		// skip all posts not created by our app
		// if (story_data.source_app_id !== "281109321931593") {
		// 	return;
		// }
		var mb = stories[i].querySelector("span.userContent");

		parseStreamMessage(mb, post_id);
	}
}

function parseStream() {
	console.debug("parseStream");
	var stories = document.getElementsByClassName("uiStreamStory");
	for (var i = 0, len = stories.length; i < len; i++) {
		var full_link = stories[i].querySelector(".uiStreamSource a");
		if (!full_link) { continue; }
		try {
			var post_id = full_link.href.match(/=(\d+)&id/)[1];
			var mb = stories[i].querySelector("span.userContent");
			parseStreamMessage(mb, post_id);
		} catch (e) {
			console.debug("Exception " + e + " in content " + full_link.href);
			continue;
		}

	}
}

var refresh = function () {
	// if (window.location.indexOf("facebook.com/profile.php") !== -1) {
	if (document.body.className.indexOf("timelineLayout") !== -1) {
		// Parse posts from Timeline if Timeline layout
		parseTimelineProfile();
	} else if (document.body.className.indexOf("home") !== -1) {
		// Parse front page for stream posts
		parseStream();
	}
};

if (window.frameElement === null) {
	console.log("FBCS setting interval from " + window.location);
	window.setInterval(refresh, 1000);
}
})();
