function extractKey(fbid, keyid, data) {
	var numkeys = $(data).filter("pre").size();
	if (numkeys != 1) {
		error("Could not retrieve Key! " + data);
	} else {
		var friend = {};
		if (typeof localStorage[fbid] !== "undefined") {
			friend = JSON.parse(localStorage[fbid]);
		}
		friend.gpgkeyid = keyid;
		friend.gpgkey = $(data).filter("pre").html();
		localStorage[fbid] = JSON.stringify(friend);
	}
}

function requestKeysForID(fbid, keyid) {
	// todo option
	// todo grab key url for checking
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'http://gpg-keyserver.de/pks/lookup?search=' + keyid + '&op=get', true);
	xhr.onreadystatechange = function () {
		if (xhr.readyState == 4) {
			extractKey(fbid, keyid, xhr.responseText);
		}
	};
	xhr.send();
}
