function handleFileSelect(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var files = evt.target.files;
	chrome.extension.getBackgroundPage().broadmask.imgHost.handleFiles(files);
}	

function handleFileDrop(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var files = evt.dataTransfer.files;
	chrome.extension.getBackgroundPage().broadmask.imgHost.handleFiles(files);
}

function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
}

function imgAuth() {
	chrome.extension.getBackgroundPage().broadmask.imgHost.performAuth();
}

function error(msg) {
	$("#errors").append("<p>" + msg + "</p>");
	$("#errormsg").show();
}

function debug(msg) {
	$("#errors").append("<p>DEBUG: " + msg + "</p>");
	$("#errormsg").show();
}

function hideErrors() {
	$("#errormsg").hide();
	$("#errors").empty();
}

