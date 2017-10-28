var database = require('./data/database');
var responseHooker = require('./response-hooker');

var idempotencyHeaderKey, supportedEndpoints;
var preProcessorFlowCallback, postProcessorFlowCallback;


/*
Handlers
*/
function initMiddleware(server, repoInitParams, headerKeyName) {

	console.log('Starting middleware initializing.');

	return validateInputParams(repoInitParams, headerKeyName)
		.then(() => {

			idempotencyHeaderKey = headerKeyName.toLowerCase();

			return database.init(repoInitParams)
				.then(function () {
					return database.openConnection();
				})
				.then(function () {
					//TODO: Add log -> Middleware initializing ended successfuly.
					server.use(responseHooker);
					console.log('Middleware initializing ended successfuly.');
					return Promise.resolve();
				})
				.catch(function (error) {
					//TODO: Add log -> Failed initialize middleware.
					console.log('Failed to init middleware. ');
					return Promise.reject(error);
				});
		});
}

function validateInputParams(repoInitParams, headerKeyName) {
	return new Promise(function (resolve, reject) {
		if (!repoInitParams || !typeof repoInitParams === 'object') {
			reject("Invalid or empty arguement was provided. [Argument name: repoInitParams]");
		}
		if (!headerKeyName || headerKeyName == '') {
			reject("Invalid or empty arguement was provided. [Argument name: headerKeyName]");
		}
		//TODO: support Endpoints
		resolve();
	});
}

function generateIdempotencyContext(req, processorResponse, proxyResponse) {
	if (!req || !req.headers || !req.url || !req.method) {
		throw new Error("An invalid req object was provided.");
	}

	return {
		"idempotencyKey": req.headers[idempotencyHeaderKey],
		"url": req.url,
		"method": req.method,
		"processorResponse": processorResponse,
		"proxyResponse": proxyResponse
	}
}



/*
Request Handling
*/
function processRequest(req, res, next) {

	if (!req.headers[idempotencyHeaderKey]) {
		console.log('Idempotency key was not provided.');
		return next();
	}

	var idempotencyContext = generateIdempotencyContext(req, null, null);

	//TODO: validate its a supported operation
	//TODO: add log -> idempotent request handling process started
	database.createIdempotentFlowRecord(idempotencyContext)
		.then(function (result) {

			//EXECUTE PRE PROCESSOR EVENT IF ITS NEEDEED
			//TODO: (Should add the callback per url(url))
			if (preProcessorFlowCallback) {
				return preProcessorFlowCallback(req, res, next);
			}

			//ITS THE FIRST TIME -> continue with the regular flow
			if (result.created) {
				return next();
			}

			//IDEMPOTENT FLOW COMPLETED -> return proxy response
			if (result.record && result.record.proxy_response) {
				console.log('Returned idempotent response: ' + JSON.stringify(result.record.proxy_response));
				// return res.status(result.proxy_response.status_code).json(JSON.parse(result.proxy_response.body));
				res.status(result.record.proxy_response.status_code);
				return res.json(result.record.proxy_response.body);
			}

			//IDEMPOTENT FLOW MISSING POST PROCESSOR PART -> invoke event
			//Might be because of failure on PaymentStorage or TaskScheduler
			if (result.record && result.record.processor_response && !result.record.proxy_response) {
				if (postProcessorFlowCallback) {
					console.log('Failed to operate request during idempotency key');
					return postProcessorFlowCallback(req, res, next);
				}
			}

			res.status(409)
			return res.json({
				error: "Failed to operate request during to idempotency key"
			});
		})
		.catch(function (error) {
			console.log('Error accured while trying to get idempotency flow: ' + JSON.stringify(error));
		});
}

function isIdempotencyRequired(idempotencyContext) {
	// TODO: Add bussiness logic
	// return idempotencyContext.key && supportedEndpoints.includes(idempotencyContext.url) ? true : false;
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

	//TODO: add log -> idempotent response handling process started
	database.saveIdempotentFlow(idempotencyContext)
		.then(function (response) {
			console.log('Idempotent flow saved in DB successfuly.');
			return next();
		})
		.catch(function (error) {
			console.log('Error accured while trying to save idempotency flow: ' + JSON.stringify(error));
			return next();
		});
}

function saveIdempotentProcessorResponse(idempotencyContext) {

	if (!idempotencyContext) {
		return Promise.reject('Invalid idempotencyContext was provided');
	}

	return database.saveIdempotentProcessorResponse(idempotencyContext)
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
	if (!cb || !typeof cb === "function") {
		throw new Error('An invalid callback was provided');
	}
	preProcessorFlowCallback = cb;
}

function registerPostProcessorFlowFailedEvent(cb) {

	if (!cb || !typeof cb === "function") {
		throw new Error('An invalid callback was provided');
	}
	postProcessorFlowCallback = cb;
}




module.exports = {
	initMiddleware: initMiddleware,
	registerPreProcessorFlowEvent: registerPreProcessorFlowEvent,
	registerPostProcessorFlowFailedEvent: registerPostProcessorFlowFailedEvent,
	processRequest: processRequest,
	processResponse: processResponse,
	saveIdempotentProcessorResponse: saveIdempotentProcessorResponse
};