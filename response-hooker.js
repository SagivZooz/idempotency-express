'use strict';
var mung = require('express-mung');

function resJson(body, req, res) {
	res["body"] = body;
	body["body"] = "This is body";
	console.log('');
	return body;
}

module.exports = mung.json(resJson);