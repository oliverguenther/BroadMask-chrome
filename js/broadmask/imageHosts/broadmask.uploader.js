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


	var dropbox = this.d.getElementById("files-dropzone"),
		filepicker = this.d.getElementById("files-picker");
	// setup listeners
	dropbox.addEventListener('dragover', this.fileInputs.bind(this), false);
	dropbox.addEventListener('drop', this.fileInputs.bind(this), false);
	filepicker.addEventListener('change', this.fileInputs.bind(this), false);
}

Broadmask_Uploader.prototype.addFile = function (filename, dataURL) {
	"use strict";
	var preview = this.d.getElementById("files-preview"),
		wrapper = this.d.createElement('div'),
		statusicon = this.d.createElement('img'),
		thumbdiv = this.d.createElement('div'),
		thumb = this.d.createElement('img'),
		that = this;
	statusicon.className = "statusicon";
	wrapper.className = "uploadprogress";
	wrapper.id = Math.round(Math.random() * 100);
	thumb.className = "thumb";
	thumbdiv.className = "picasa-thumbwrapper";
	thumb.src = dataURL;
	thumb.title = filename;
	thumbdiv.appendChild(thumb);
	wrapper.appendChild(thumbdiv);
	this.root.appendChild(wrapper);
	that.share.enableSharing('thumb');
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
			that.addFile(theFile.name, e.target.result);
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
