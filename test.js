
var idempotencyKey = "asdf";
var x = "/charge/asdf";
var y = "charge/asdf";
var z = "/charge?ahe=2";

isIdempotencyRequired({
	headers: {},
	url: x
});

isIdempotencyRequired({
	headers: {},
	url: y
});

isIdempotencyRequired({
	headers: {},
	url: z
});

function isIdempotencyRequired(req) {
	var key = req.headers[idempotencyKey];
	var endpoint = "";

	var urls = req.url.split('/');
	if (urls[0] != "") {
		endpoint = urls[0];
	} else {
		endpoint = urls[1].split('?')[0];
	}

	console.log(endpoint);
}