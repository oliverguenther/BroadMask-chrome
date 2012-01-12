function Broadmask_Uploader(d, id, host) {
	"use strict";
	this.host = host;
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
	filepicker.value = "choose a file"; //chrome.i18n.getMessage("filechoose");
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
		thumbdiv = this.d.createElement('div'),
		thumb = this.d.createElement('img'),
		that = this;
	wrapper.className = "uploadprogress";
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
		that.host.uploadImage(file, progress, function (status, url) {
			if (url !== undefined) {
				progress.value = 100;
				console.log("success!");
				window.setTimeout(function () {
					that.d.removeChild(wrapper);
				}, 1000);
			}
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
