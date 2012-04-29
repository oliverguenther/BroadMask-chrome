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
	var start, end, it, bm_message,
	messages = document.getElementsByClassName("messageBody");

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


