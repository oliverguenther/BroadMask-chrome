var imgid = 0;


function enableShareForm(enable) {
	if (enable === true) {
		$("#share-select").removeAttr("disabled");
		$("#share-submit-btn").removeAttr("disabled");
		$("#share-reset-btn").removeAttr("disabled");
	} else {
		$(".uploadprogress").remove();
		$("#share-select").attr("disabled", "disabled");
		$("#share-submit-btn").attr("disabled", "disabled");
		$("#share-reset-btn").attr("disabled", "disabled");
	}
}


function previewFileType(f, data) {
	var thumb = [];
	if (f.type.match("image.*")) {
		thumb.push('<img class="thumb" src="');
		thumb.push(data);
		thumb.push('" title="');
		thumb.push(f.name);
		thumb.push('"/>');
	} else {
		thumb.push('<div class="thumb" src="');
		thumb.push(data);
		thumb.push('"><strong>');
		thumb.push(f.type + "</strong><br/>" + f.name);
		thumb.push('</div>');
	}
	return thumb.join("");
}

/*
* Handle user files, and upload them to the image hoster
* @param files an array of files
*/
function handleFiles (files) {
	"use strict";
	var that = this,
	i,
	f,
	len = files.length,
	reader,
	initRead;

	initRead = function (theFile) {
		return function (e) {
			var thumb = [];
			thumb.push('<div id="');
			thumb.push(imgid);
			thumb.push('" class="uploadprogress"><div class="picasa-thumbwrapper">');
			thumb.push(previewFileType(theFile, e.target.result));
			thumb.push('</div></div>');
			$("#files-preview").append(thumb.join(''));
			imgid++;
		};
	};
	// Loop through the FileList and render image files as thumbnails.
	for (i = 0; i < len; i = i + 1) {
		f = files[i];
		reader = new FileReader();
		if (f.size > 10000000) {
			UI.error('The file <strong>' + escape(f.name) + '</strong> is too large to upload. Select a smaller file');
			return;
		}

		if (f.type.match("(image.*|video.*|audio.*)")) {
			reader.onload = initRead(f);
			reader.onloadend = function () {
			};
			reader.readAsDataURL(f);
		} else {
			UI.error('The file <strong>' + escape(f.name) + '</strong> does not match any allowed file type (image/*, video/*, audio/*). Detected type: "' + f.type + '"');
		}
	}

};

/** Event handler for HTML5 file inputs */
function fileInputs (evt) {
	evt.stopPropagation();
	evt.preventDefault();

	if (evt.type === 'dragover') {
		evt.dataTransfer.dropEffect = 'copy';
		return;
	}
	var files = evt.target.files || evt.dataTransfer.files;
	if (files !== undefined) {
		handleFiles(files);
	}
};


$(document).ready(function() {
	UI.bmMenu("navbar", "upload");

	$('#share-submit-btn').click(function () {
		var images = [],
		plaintext = $("#message").val(),
		groupid = $("#share-select").val();
		$(".thumb").each(function() {
			var image = {}, 
			progress = document.createElement("progress");
			progress.value = 0;
			progress.max = 100;
			image.src = this.getAttribute("src");

			image.onprogress = function (e) {
				if (e.lengthComputable && progress !== null ) {
					progress.value = (e.loaded / e.total) * 100;
				}
			};

			image.error = UI.error;

			image.success = function (xhr,	url) {
				var statusicon = document.createElement("img");
				if (url) {
					statusicon.src = chrome.extension.getURL("frontend/img/ok.png");
					$(progress).after("<p><a href=\"" + url +"\">Link</a></p>");
				} else {
					statusicon.src = chrome.extension.getURL("frontend/img/warning.png");
				}
				$(progress).replaceWith(statusicon);
			};

			// append to statusprogress
			$(this).parent().parent().append(progress);

			images.push(image);
		});

		var message = {};
		if (images.length > 0) {
			message.media = images;
		}

		if (plaintext) {
			message.plaintext = plaintext;
		}

		if (message.plaintext || message.media) {
			bm.share(groupid, message);
		}

		return false;
	});

	$('#share-reset-btn').click(function () {
		$(".uploadprogress").remove();
		return false;
	});

	var instances = bm.module.get_stored_instances();
	if (instances.error === true) {
		UI.error("Error loading instances:" + instances.error_msg);
		return;
	}
	
	if (Object.size(instances) > 0) {
		$("#create_users_note").hide();
		enableShareForm(true);

		/** Fill instances select */
		var options = [];
		$.each(instances, function (id, instance) {
			options.push("<option value=\"");
			options.push(id);
			options.push("\">");
			options.push(instance.name);
			options.push("</option>");
		});
		$("#share-select").append(options.join(""));

		/** setup event listeners */
		var dropbox = document.getElementById("message"),
		filepicker = document.getElementById("files-picker");
		dropbox.addEventListener('dragover', fileInputs, false);
		dropbox.addEventListener('drop', fileInputs, false);
		filepicker.addEventListener('change', fileInputs, false);
	} else {
		enableShareForm(false);
	}
});

