// Search for BM IDs in Stream Messages

var handleMessage = function (streamElement, message) {
	"use strict";
	chrome.extension.sendRequest({message: "decrypt", data: message}, function (response) {
		if (typeof response === 'object') {
			// remove child nodes
			while (streamElement.hasChildNodes()) {
				streamElement.removeChild(streamElement.lastChild);
			}
			if (response.urls) {
				// image urls, display them
				for (var i = 0, len = response.urls.length; i < len; i += 1) {
					var img = document.createElement("img");
					img.src = response.urls[i];

				}
			} else if (response.plaintext) {
				streamElement.innerHTML = "<p>" + response.plaintext + "</p>";
			}
		}
	});
};

var refresh = function () {
	"use strict";
	var start, end, it, bm_message,
	messages = document.getElementsByClassName("messageBody");
	console.log(messages);

	if (messages === null || typeof messages === 'undefined') {
		return;
	}
	for (var i = 0, len = messages.length; i < len; i++) {
		it = messages[i].innerText;
		if (it !== null && it !== 'undefined') {
			start = it.indexOf('=== BEGIN BM DATA ===');
			end = it.indexOf('=== END BM DATA ===');
			if (start !== -1 && end !== -1) {
				messages[i].innerHTML = "<p>I've shared some new content using Broadmask!</p>";
				bm_message = it.substr(start + 21, end - 23).trim();
				handleMessage(messages[i], bm_message);
			}
		}
	}
};

window.setTimeout("refresh()", 0);


