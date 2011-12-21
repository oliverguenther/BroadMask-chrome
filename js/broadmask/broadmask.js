function broadmask() {

	// Setup API handlers
	this.imgHost = new Broadmask_picasa();
	this.osn = new Broadmask_facebook();

	// Setup crypto implementations
	this.shared = new Broadmask_aes();
	this.broadcast = new Broadmask_be();
	
	// Setup NACL module
	this.nacl = new Broadmask_nacl();
	this.nacl.run();

}
