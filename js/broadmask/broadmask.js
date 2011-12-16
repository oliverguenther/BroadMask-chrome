broadmask.nacl = function () {

	// Handler for native client module
	this.module = null;

};

broadmask.nacl.ids = {
	EMBED: 'broadmask',
	LISTENER: 'broadmask_listener'
};

broadmask.nacl.prototype.moduleDidLoad = function () {
	this.module = document.getElementById(broadmask.nacl.ids.EMBED);
};

broadmask.nacl.prototype.run = function () {
	var listener = document.getElementById(broadmask.nacl.ids.LISTENER);

	// Attach message listener to the surrounding div
	listener.addEventListener('load', this, true);

	// Setup nacl
	listener.innerHTML = '<embed id="' +
		broadmask.nacl.ids.EMBED + '" ' +
		'src=broadmask.nmf ' +
		'type="application/x-nacl" ' +
		'width="480" height="480" />';
};
