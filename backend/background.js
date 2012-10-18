

var broadmask = new Broadmask();


function store(key, obj) {
	localStorage[key] = obj;
}

function get(key) {
	return localStorage[key];
}

function copyToClipboard(text) {
	var ct = document.getElementById("copyWrapper");
	ct.value = text;
	ct.focus();
	ct.select();
	document.execCommand("copy");
}

var bmTabid = null;


$(document).ready(function () {
	// start NPAPI plugin
	broadmask.run();
});

function pluginLoaded() {
	broadmask.moduleDidLoad();
}

function handleMenuAction(cmdata, tab) {
	chrome.tabs.create({url: chrome.extension.getURL("frontend/app/encrypt.html")}, function (bmtab) {
		chrome.tabs.sendRequest(bmtab.id, {message: "encrypt", selection: cmdata.selectionText, tabid: tab.id});
	});
}


var cmid = null;
chrome.contextMenus.removeAll(function () {
	cmid = chrome.contextMenus.create({
		title: "Encrypt with BroadMask",
		contexts: ["selection"],
		onclick: handleMenuAction,
		documentUrlPatterns: ["http://*.facebook.com/*", "https://*.facebook.com/*"]
	});
});



chrome.browserAction.onClicked.addListener(function() {
	chrome.tabs.create({url: chrome.extension.getURL("frontend/app/upload.html")}, function(tab) {
		bmTabid = tab.id;
		chrome.tabs.onRemoved.addListener(function () {
			bmTabid = null;
		});
	});
});
