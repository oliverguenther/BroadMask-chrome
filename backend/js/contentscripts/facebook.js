// Search for BM IDs in Stream Messages
var refresh = function () {
	"use strict";
	var start, end, it, images,
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
				images = it.substr(start + 21, end - 23).trim().split("\n");
				chrome.extension.sendRequest({message: "newBMdataFromCS", data: images});
			}
		}
	}
};

window.setTimeout("refresh()", 1000);


