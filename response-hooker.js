'use strict';
var mung = require('express-mung');

function resJson(body, req, res) {
	res["body"] = body;
}

module.exports = mung.json(resJson);