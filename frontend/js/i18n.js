// Replace span tags with localized message
$(document).find('*[i18n]').each(function () {
	"use strict";
	var msg, i18nmsg,
		tag = $(this);
	// Replace span tag with its content
	if (tag.is('span')) {
		msg = this.innerHTML;
		i18nmsg = chrome.i18n.getMessage(msg);
		if (i18nmsg) {
			tag.replaceWith(i18nmsg);
		}
	} else if (tag.is('input') && tag.attr('type') === 'button') {
		// Replace button value with localized message
		msg = tag.attr("value");
		tag.attr('value', chrome.i18n.getMessage(msg));
	}
	// TODO remove debug
	if (chrome.i18n.getMessage(msg) === "") {
		console.log("MISSING i18n key " + msg);
	}
});
