var Database = require('./data/database');

var db, idempotencyKey, supportedEndpoints;

var initMiddleware = function (repoType, repoInitParams, headerKeyName, operations) {

	console.log('Starting middleware initializing.');

	db = new Database(repoType);
	db.init(repoInitParams)
		.then(function () {
			return db.openConnection();
		})
		.then(function () {
			//TODO: Add log -> Middleware initializing ended successfuly.
			console.log('Middleware initializing ended successfuly.');
		})
		.catch(function (error) {
			//TODO: Add log -> Failed initialize middleware.
			console.log('Error: ' + JSON.stringify(error.message));
		});

	idempotencyKey = headerKeyName;
	supportedEndpoints = operations;
}


/*
Request Handling
*/
var processRequest = function (req, res, next) {

	idempotencyContext = generateIdempotencyContext(req);

	if (isIdempotencyRequired(idempotencyContext)) {

		//TODO: add log -> idempotency handling process started
		db.getPreviousIdempotentFlow(idempotencyContext)
			.then(function (response) {
				if (response) {
					console.log('Get previous response: ' + JSON.stringify(response));
				} else {
					console.log('Idempotency key was not found');
				}
			})
			.catch(function (error) {
				console.log('Error accured while trying to get idempotency flow: ' + JSON.stringify(error));
			});
	}
}

function generateIdempotencyContext(req) {
	return {
		"idempotencyKey": req.headers[idempotencyKey],
		"endpoint": req.url,
		"method": req.method,
		"processorResponse": {status_code: 201, body: "Resource created"},
		"proxyResponse": {status_code: 204, body: "Resource deleted"}
	}
}

function isIdempotencyRequired(idempotencyContext) {
	// TODO: Add bussiness logic
	// return idempotencyContext.key && supportedEndpoints.includes(idempotencyContext.endpoint) ? true : false;
	return true;
}


/*
Response Handling
*/
var processResponse = function (req, res, next) {

	idempotencyContext = generateIdempotencyContext(req);

	if (isIdempotencyRequired(idempotencyContext)) {

		//TODO: add log -> idempotency handling process started
		db.saveIdempotentFlow(idempotencyContext)
			.then(function (response) {
				console.log('Idempotent flow saved in DB successfuly.');
			})
			.catch(function (error) {
				console.log('Error accured while trying to save idempotency flow: ' + JSON.stringify(error));
			});
	}
}


module.exports = {
	initMiddleware: initMiddleware,
	processRequest: processRequest,
	processResponse: processResponse
};