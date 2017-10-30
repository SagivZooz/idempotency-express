var database = require('./data/database');
var responseHooker = require('./response-hooker');
var logger = require('./logger-wrapper');

var idempotencyHeaderKey, supportedEndpoints, requestIdHeaderKey;
var preProcessorFlowCallback, postProcessorFlowCallback;


/*
Handlers
*/
function initMiddleware(params) {

	return validateInputParams(params)
		.then(() => {

			logger.init(params.loggerParams.logger);
			logger.getInstance().trace('Initializing idempotency middleware');

			requestIdHeaderKey = params.loggerParams.requestIdHeaderKey;
			idempotencyHeaderKey = params.headerKeyName.toLowerCase();

			return database.init(params.repoInitParams)
				.then(function () {
					return database.openConnection();
				})
				.then(function () {
					params.server.use(responseHooker);

					logger.getInstance().trace('Idempotency middleware initialization complete successfuly');
					return Promise.resolve();
				})
				.catch(function (error) {
					logger.getInstance().error({
						msg: 'Failed to init middleware.',
						error: error.message || error
					});
					return Promise.reject(error);
				});
		});
}

function validateInputParams(params) {
	return new Promise(function (resolve, reject) {
		if (!params.server || !typeof params.server === 'object') {
			reject("A required arguement is invalid or empty. [Argument name: server]");
		}
		if (!params.repoInitParams || !typeof params.repoInitParams === 'object') {
			reject("A required arguement is invalid or empty. [Argument name: repoInitParams]");
		}
		if (!params.headerKeyName || params.headerKeyName == '') {
			reject("A required arguement is invalid or empty. [Argument name: headerKeyName]");
		}
		if (!params.loggerParams || !typeof params.loggerParams === 'object') {
			reject("A required arguement is invalid or empty. [Argument name: loggerParams]");
		}
		if (!params.loggerParams.logger) {
			reject("A required arguement is invalid or empty. [Argument name: logger]");
		}
		if (!logger.isLoggerImplementsReuiredFunctions(params.loggerParams.logger)) {
			reject("Logger is required to implement the following method: " + logger.getRequiredImplementationMethods());
		}
		//TODO: Check for logger methods implementations
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

function generateLogContext(req) {
	return {
		'idempotencyKey': req.headers[idempotencyHeaderKey],
		'method': req.method,
		'url': req.url,
		'requestId': req.headers[requestIdHeaderKey]
	};
}


/*
Request Handling
*/
function processRequest(req, res, next) {

	var logContext = generateLogContext(req);
	logger.getInstance().info(logContext, 'Processing request in idempotency middleware');

	if (!req.headers[idempotencyHeaderKey]) {
		logger.getInstance().trace(logContext, 'Idempotency key was not provided. calling next.');
		return next();
	}

	var idempotencyContext = generateIdempotencyContext(req, null, null);

	//TODO: validate its a supported operation
	database.createIdempotentFlowRecord(idempotencyContext)
		.then(function (result) {

			//EXECUTE PRE PROCESSOR EVENT IF ITS NEEDEED
			//TODO: (Should add the callback per url
			if (preProcessorFlowCallback) {
				logger.getInstance().trace(logContext, '\'Pre-Processor event is invoked');
				return preProcessorFlowCallback(req, res, next);
			}

			//ITS THE FIRST TIME -> continue with the regular flow
			if (result.created) {
				logger.getInstance().trace(logContext, 'Idempotent record created in DB successfuly.');
				return next();
			}

			//IDEMPOTENT FLOW COMPLETED -> return proxy response
			if (result.record && result.record.proxy_response) {
				result.record.proxy_response.body = tryJsonParse(result.record.proxy_response.body);
				logContext['response'] = result.record.proxy_response;
				logger.getInstance().info(logContext, 'Returning idempotent response');

				res.status(result.record.proxy_response.status_code);
				return res.json(result.record.proxy_response.body);
			}

			//IDEMPOTENT FLOW MISSING POST PROCESSOR PART -> invoke event
			if (result.record && result.record.processor_response && !result.record.proxy_response) {
				if (postProcessorFlowCallback) {
					logger.getInstance().trace(logContext, '\'Post-Processor event is invoked');
					return postProcessorFlowCallback(req, res, next);
				}
			}

			logger.getInstance().info(logContext, 'Failed to process request during to uncompleted idempotent flow');
			res.status(409)
			return res.json({
				error: "Failed to process request during to uncompleted idempotent flow"
			});
		})
		.catch(function (error) {
			var errorObj = {
				msg: 'Error accured while trying to get idempotency flow',
				context: logContext,
				error: error.message || error
			};
			logger.getInstance().error(errorObj);
			next(errorObj);
		});
}

function isIdempotencyRequired(idempotencyContext) {
	// TODO: Add bussiness logic
	// return idempotencyContext.key && supportedEndpoints.includes(idempotencyContext.url) ? true : false;
	return true;
}

function tryJsonParse(value){
	try{
		return JSON.parse(value);
	}
	catch(err) {
		return value;
	}
}


/*
Response Handling
*/
function processResponse(req, res, next) {

	var logContext = generateLogContext(req);
	logger.getInstance().info(logContext, 'Processing response in idempotency middleware');

	var processorResponse = (res && res.processorResponse) ? res.processorResponse : null;
	var proxyResponse = {
		status_code: res.statusCode,
		body: res.body
	};
	if (proxyResponse && proxyResponse.body && typeof proxyResponse.body === 'object') {
		proxyResponse.body = JSON.stringify(proxyResponse.body);
	}

	var idempotencyContext = generateIdempotencyContext(req, processorResponse, proxyResponse);

	database.saveIdempotentFlow(idempotencyContext)
		.then(function (response) {
			logContext['response'] = proxyResponse;
			logger.getInstance().info(logContext, 'Idempotent flow saved in DB successfuly.');
			return next();
		})
		.catch(function (error) {
			var errorObj = {
				msg: 'Error accured while trying to save idempotency flow',
				context: logContext,
				error: error.message || error
			};
			logger.getInstance().error();
			return next(errorObj);
		});
}

function saveIdempotentProcessorResponse(idempotencyContext) {

	if (!idempotencyContext) {
		return Promise.reject('Invalid idempotencyContext was provided');
	}

	return database.saveIdempotentProcessorResponse(idempotencyContext)
		.then(function (response) {
			logger.getInstance().info(idempotencyContext,
				'Idempotent proocessor response saved in DB successfuly.');
			return Promise.resolve();
		})
		.catch(function (error) {
			logger.getInstance().error({
				msg: 'Error accured while trying to save idempotent processor response',
				context: idempotencyContext,
				error: error.message || error
			});
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