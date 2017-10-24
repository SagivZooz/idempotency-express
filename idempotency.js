var Database = require('./data/database');

var db, idempotencyKey, supportedEndpoints;
var preProcessorFlowCallback, postProcessorFlowCallback;

function initMiddleware(repoType, repoInitParams, headerKeyName, operations) {

	console.log('Starting middleware initializing.');

	idempotencyKey = headerKeyName;
	supportedEndpoints = operations;

	db = new Database(repoType);
	return db.init(repoInitParams)
		.then(function () {
			return db.openConnection();
		})
		.then(function () {
			//TODO: Add log -> Middleware initializing ended successfuly.
			console.log('Middleware initializing ended successfuly.');
			return Promise.resolve();
		})
		.catch(function (error) {
			//TODO: Add log -> Failed initialize middleware.
			console.log('Error: ' + JSON.stringify(error.message));
			return Promise.reject(error);
		});
}

/*
Request Handling
*/
function processRequest(req, res, next) {

	idempotencyContext = generateIdempotencyContext(req, null, null);

	if (isIdempotencyRequired(idempotencyContext)) {

		//TODO: add log -> idempotent request handling process started
		db.createIdempotentFlowRecord(idempotencyContext)
			.then(function (result) {

				//EXECUTE PRE PROCESSOR EVENT IF ITS NEEDEED
				//TODO: (Should add the callback per endpoint(url))
				if (preProcessorFlowCallback) {
					return preProcessorFlowCallback(req, res, next);
				}

				//ITS THE FIRST TIME -> continue with the regular flow
				if (result.created) {
					return next();
				}

				//IDEMPOTENT FLOW COMPLETED -> return proxy response
				if (result.record.proxy_response) {
					return res.status(result.proxy_response.statusCode).json(JSON.parse(result.proxy_response.body));
				}

				//IDEMPOTENT FLOW MISSING POST PROCESSOR PART -> invoke event
				//Might be because of failure on PaymentStorage or TaskScheduler
				if (result.record.processor_response && !result.record.proxy_response) {
					if (postProcessorFlowCallback) {
						return postProcessorFlowCallback(req, res, next);
					}

					//return res.status(409).json(JSON.parse({error: "Failed to operate request during idempotency key"}));
				}

				console.log(result);
			})
			.catch(function (error) {
				console.log('Error accured while trying to get idempotency flow: ' + JSON.stringify(error));
			});
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
function processResponse(req, res, next) {

	var processorResponse = (res && res.processorResponse) ? res.processorResponse : null;
	var proxyResponse = {
		status_code: res.statusCode,
		body: res.body
	};
	var idempotencyContext = generateIdempotencyContext(req, processorResponse, proxyResponse);

	if (isIdempotencyRequired(idempotencyContext)) {

		//TODO: add log -> idempotent response handling process started
		db.saveIdempotentFlow(idempotencyContext)
			.then(function (response) {
				console.log('Idempotent flow saved in DB successfuly.');
			})
			.catch(function (error) {
				console.log('Error accured while trying to save idempotency flow: ' + JSON.stringify(error));
			});
	}
}

function saveIdempotentProcessorResponse(idempotencyContext) {

	return db.saveIdempotentProcessorResponse(idempotencyContext)
		.then(function (response) {
			console.log('Idempotent flow saved in DB successfuly.');
			return Promise.resolve();
		})
		.catch(function (error) {
			console.log('Error accured while trying to save idempotency flow: ' + JSON.stringify(error));
			return Promise.reject(error);
		});
}

/*
Register Events
*/
function registerPreProcessorFlowEvent(cb) {
	if (cb && typeof cb === "function") {
		preProcessorFlowCallback = cb;
	}
	//TODO: throw exception
}

function registerPostProcessorFlowFailedEvent(cb) {
	if (cb && typeof cb === "function") {
		postProcessorFlowCallback = cb;
	}
	//TODO: throw exception
}


/*
Handlers
*/
function generateIdempotencyContext(req, processorResponse, proxyResponse) {
	return {
		"idempotencyKey": req.headers[idempotencyKey],
		"endpoint": req.url,
		"method": req.method,
		"processorResponse": processorResponse,
		"proxyResponse": proxyResponse
	}
}


module.exports = {
	initMiddleware: initMiddleware,
	registerPreProcessorFlowEvent: registerPreProcessorFlowEvent,
	registerPostProcessorFlowFailedEvent: registerPostProcessorFlowFailedEvent,
	processRequest: processRequest,
	processResponse: processResponse,
	saveIdempotentProcessorResponse: saveIdempotentProcessorResponse,
};