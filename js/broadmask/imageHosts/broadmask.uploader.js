function Broadmask_Uploader(d, id, host, sharecb) {
	"use strict";
	this.host = host;
	this.share = sharecb;
	this.broadmask = chrome.extension.getBackgroundPage().broadmask;
	this.d = d;
	this.root = d.getElementById(id);

	this.fileInputs = function (evt) {
		evt.stopPropagation();
		evt.preventDefault();

		if (evt.type === 'dragover') {
			evt.dataTransfer.dropEffect = 'copy';
			return;
		}
		var files = evt.target.files || evt.dataTransfer.files;
		if (files !== undefined) {
			this.handleFiles(files);
		}
	};

	var filepicker = d.createElement('input'),
		filewrapper = d.createElement('div'),
		dropbox = d.createElement('div');

	filepicker.id = "filepicker-" + id;
	filewrapper.className = "filepicker";
	filepicker.type = "file";
	filepicker.multiple = "true";
	dropbox.id = "dropzone-" + id;
	dropbox.innerText = "drop files here!"; // chrome.i18n.getMessage("dropzone") + this.host.name;
	dropbox.className = "dropzone";
	// setup listeners
	dropbox.addEventListener('dragover', this.fileInputs.bind(this), false);
	dropbox.addEventListener('drop', this.fileInputs.bind(this), false);
	filepicker.addEventListener('change', this.fileInputs.bind(this), false);
	filewrapper.appendChild(filepicker);
	this.root.appendChild(filewrapper);
	this.root.appendChild(dropbox);

}

Broadmask_Uploader.prototype.newUpload = function (filename, dataURL) {
	"use strict";
	var progress = this.d.createElement('progress'),
		wrapper = this.d.createElement('div'),
		statusicon = this.d.createElement('img'),
		thumbdiv = this.d.createElement('div'),
		thumb = this.d.createElement('img'),
		that = this;
	statusicon.className = "statusicon";
	wrapper.className = "uploadprogress";
	wrapper.id = Math.round(Math.random() * 100);
	thumb.className = "thumb";
	thumb.src = dataURL;
	thumb.title = filename;
	progress.value = 0;
	progress.max = 100;
	thumbdiv.appendChild(thumb);
	wrapper.appendChild(thumbdiv);
	wrapper.appendChild(progress);
	this.root.appendChild(wrapper);
	this.broadmask.wrapImage(dataURL, function (message, file) {
		// returned from bmp wrapping
		that.host.uploadImage(atob(file), progress, function (status, url) {
			if (url !== undefined) {
				statusicon.src = chrome.extension.getURL("img/ok.png");
				thumb.setAttribute("rel", url);
				// enable sharing option for all uploaded files
				that.share.enableSharing('thumb');
			} else {
				statusicon.src = chrome.extension.getURL("img/warning.png");
				// TODO allow retry with dataURL (popover)
			}
			wrapper.replaceChild(statusicon, progress);
		});
	});

};

/*
* Handle user files, and upload them to the image hoster
* @param files an array of files
*/
Broadmask_Uploader.prototype.handleFiles = function (files) {
	"use strict";
	var that = this,
		i,
		f,
		len = files.length,
		reader,
		initRead;

	// remove old uploads first
	$(this.d).remove('.uploadprogress');

	initRead = function (theFile) {
		return function (e) {
			that.newUpload(theFile.name, e.target.result);
		};
	};
	// Loop through the FileList and render image files as thumbnails.
	for (i = 0; i < len; i = i + 1) {
		f = files[i];
		reader = new FileReader();
		// Only process image files.
		if (f.type.match('image.*')) {
			reader.onload = initRead(f);
			reader.readAsDataURL(f);
		}
	}
};
