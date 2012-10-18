function instance_type(val) {
	switch(val) {
		case 1:
			return "Broadcast Encryption (Sender)"
			break;
		case 2:
			return "Broadcast Encryption (Receiver)"
			break;
		case 4:
			return "Shared-Key"
			break;
		default:
			return "unknown";
	}
}

function instance_details(id) {
	var members = bm.module.get_instance_members(id),
	gpg_map = bm.module.gpg_associatedKeys(),
	descriptor = bm.module.get_instance_descriptor(id),
	cache = bm.osn.cache(),
	rows = [];
	$("#instancedetail").empty()
	.append('<div class="page-header"><h3>Details <small>for instance ' + descriptor.name + '</small></h3></div>')
	.append('<h3>Identifier</h3><p>' + descriptor.id + ' </p>');
	$.each(members, function (userid, pseudonym) {
		rows.push("<tr id=\"" + userid + "\" data-type=\"detail\" data-instance=\"" + id + "\"><td>" + cache.friends[userid] + "</td>");
		rows.push("<td>" + userid + "</td><td>");
		if (typeof gpg_map === 'object' && gpg_map[userid]) {
			rows.push("<a href=\"#\" class=\"upload_key\" data-instanceid=\"" + id + "\" data-userid=\"" + userid + "\"><i class=\"icon-share\"></i> Publish (<small>PGP key: " + gpg_map[userid] + "</small>)</a><br/>");
			rows.push("<a href=\"#\" class=\"copysk_gpg\" data-id=\"" + userid + "\"><i class=\"icon-lock\"></i> Copy to clipboard (encrypted with PGP)</a></br><br/>");
		}
		rows.push("<a href=\"#\" class=\"copysk\" data-id=\"" + userid + "\"><i class=\"icon-warning-sign\"></i> Copy to clipboard (plaintext)</a>");
		rows.push("</td></tr>");
	});
	if (rows.length > 0) {
		$("#instancedetail").append('<h3>Instance members</h3><table class="table table-bordered table-striped"><thead><tr><th>Name</th><th>Id</th><th>Options</th></tr></thead><tbody>' + rows.join("") + '</tbody></table>');


		$(".upload_key").click(function () {
			var userid = $(this).attr("data-userid");
			var instanceid = $(this).attr("data-instanceid");
			upload_key(instanceid, userid);
		});


		$(".copysk").click(function () {
			var userid = $(this).attr("data-id");
			var instanceid = $(this).parent().parent().attr("data-instance");
			var instmsg = get_instance_object(instanceid, userid);
			bg.copyToClipboard(JSON.stringify(instmsg));	

		});

		$(".copysk_gpg").click(function () {
			var userid = $(this).attr("data-id"),
			instanceid = $(this).parent().parent().attr("data-instance"),
			instmsg = get_instance_object(instanceid, userid),
			enc_msg = bm.module.gpg_encrypt_for(JSON.stringify(instmsg), userid);

			bg.copyToClipboard(JSON.stringify(enc_msg.result));	
		});

	}

	// Print public key if type == 1
	if (descriptor.type === 1) {
		var pk = bm.module.get_bes_public_params(id);
		$("#instancedetail").append("<h3>Public key</h3><p style=\"word-break: break-all\">" + pk.result + "</p>");
	}

}

function print_instances() {
	var instances = bm.module.get_stored_instances(),
	rows = [];

	if (instances.error === true) {
		UI.error("Error loading instances: " + instances.error_msg);
		return;
	}

	$.each(instances, function(i, instance) {
		rows.push("<tr id=\"" + instance.id + "\"><td>");
		rows.push(instance.name);
		rows.push("</td><td>");
		rows.push(instance_type(instance.type));
		rows.push("</td><td>");
		rows.push((instance.max_users == 0) ? "-" : instance.max_users);
		rows.push('</td><td class="">');
		rows.push('<a class="instance_details" data-id="'+instance.id+'"><i class="icon-cog"></i> Details</a><br/>');
		rows.push('<a class="instance_remove" data-id="'+instance.id+'"><i class="icon-trash"></i> Trash</a><br/>');
		rows.push('</td></tr>');
	});
	if (rows.length > 0) {
		$("#instances").replaceWith('<table class="table table-bordered table-striped"><thead><tr><th>Instance</th><th>Type</th><th>Size</th><th>Options</th></tr></thead><tbody>' + rows.join("") + '</tbody></table>');

		// Add Instance button listeners
		$(".instance_details").click(function() {
			var id = $(this).attr("data-id");
			instance_details(id);
		});
		$(".instance_remove").click(function() {
			var id = $(this).attr("data-id");
			instance_remove(id);
		});
	} else {
		$("#instances").replaceWith('<p class="light">No instances have been created</p>');
	}
}
function instance_remove(id) {
	var instances = bm.module.get_stored_instances();
	if (confirm("Do you REALLY want to delete the instance '" + instances[id].name + "' ?")) {
		bm.module.remove_instance(String(id));
		location.reload(true);
	}
}

function get_instance_object (instanceid, userid) {
	var descriptor = bm.module.get_instance_descriptor(instanceid);

	if (descriptor.error) {
		UI.error("Couldn't retrieve private key for instance " + instanceid + ". Error was: " + descriptor.error_msg);
		return;
	}



	var instmsg = {}, sk = {error: true, error_msg: "No result"};
	instmsg.type = "instance";
	instmsg.instance_type = descriptor.type;
	instmsg.id = descriptor.id;
	instmsg.max_users = descriptor.max_users;
	if (descriptor.type === 1) {
		var pk = bm.module.get_bes_public_params(instanceid);
		sk = bm.module.get_member_sk(instanceid, userid);
		instmsg.pk = pk.result;
	} else if (descriptor.type === 4) {
		sk = bm.module.get_symmetric_key(instanceid);
	} else {
		UI.error("Descriptor type neither BES sender nor Shared instance? Was " + descriptor.type);
	}

	if (sk.error) {
		UI.error("Couldn't retrieve private key for instance " + instanceid + ". Error was: " + sk.error_msg);
		return;
	}


	instmsg.sk = sk.result;
	return instmsg;
}

function upload_key(instanceid, userid) {
	var instmsg = get_instance_object(instanceid, userid);

	var enc_msg = bm.module.gpg_encrypt_for(JSON.stringify(instmsg), userid);
	if (typeof enc_msg !== 'object') {
		alert("Error: Didn't return from GPG encryption!? " + enc_msg);
	} else if (enc_msg.error) {
		alert("Error: " + enc_msg.error_msg);
		return;
	} else {
		// share key
		bm.osn.shareOnWall(enc_msg.result, [userid], false, function () {});
	}
}

$(document).ready(function () {
	UI.bmMenu("navbar", "instances");
	$("#instances").append('<div class="alert alert-info"><strong>Loading</strong> Updating cache, fetching instances</div>');
	$("#create_instance :input").attr("disabled", true);
	bm.osn.checkCache(function(result) {
		$("#instances").empty();
		if (result.error) {
			UI.error(result.error_msg);
			return;
		}


		var mapped_users = bm.module.gpg_associatedKeys(),
		cache = bm.osn.cache(), 
		friends = cache.friends;

		if (Object.size(friends) == 0) {
			UI.error("Facebook friends couldn't be fetched. Did you authorize the extension yet?");
			return;
		}
		$("#create_instance :input").attr("disabled", false);
		var users_typeahead = [],
		user_ids = {};

		$.each(friends, function(id, name) {
			user_ids[name] = id;
			users_typeahead.push(name);
		});

		$("#add_user").typeahead({
			"source": users_typeahead,
			"items": 10,
		});

		$('#btn_add_user').click(function () {
			var add_user = $("#add_user").val(),
			classes = ["user_block"];
			id = user_ids[add_user];


			if (add_user && id) {
				var content = [];
				content.push(add_user);
				content.push("<br/>Facebook ID: ");
				content.push(id);
				if (mapped_users[id]) {
					content.push("<br/>");
					content.push("PGP fingerprint: ");
					content.push(mapped_users[id]);
					classes.push("pgp_user");
				}
				$('#added_users').append('<div class="' + classes.join(" ") + '" data-id="' + id +'" >' + content.join("") + '</div>');
			}

			return false;
		});

		$("#add_user").keyup(function(event){
			if(event.keyCode == 13){
				$("#btn_add_user").click();
				$(this).val('');
			}
		});

		$("#btn_create_instance").click(function () {
			var cached_instances, 
			inst = {}
			users = [],
			maxusers = 0;
			inst.name = $("#instance_name").val();
			inst.type = $("#instance_type").val();
			$("#create_instance_success").hide();
			$(".user_block").each(function () {
				users.push($(this).attr('data-id'));
				// set max users to > 2*users
				maxusers += 2;
			});
			inst.users = users;

			inst.id = Crypto.SHA256(inst.name + users.join("") + inst.type);

			if (inst.type === "bes") {
				var i = 3, pow = 0;
				while (pow <= maxusers) {
					pow = Math.pow(2, i++);
				}
				inst.max_size = pow;
				var params = bm.module.create_sender_instance(inst.id, inst.name, pow); 
				console.log(params);
			} else {
				bm.module.create_shared_instance(inst.id, inst.name);
			}
			var added_members = bm.module.add_members(inst.id, users);
			$("#create_instance_success").show();
			print_instances();
		});
		print_instances();
	});
});
