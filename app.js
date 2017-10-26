var idempotency = require('./idempotency.js')

var repoInitParams = {
	type: "cassandra",
	contactPoints: ["127.0.0.1:9042"],
	user: "user",
	password: "user",
	keyspaceName: "idempotency",
	environmentCreation: true,
	keyspaceReplication: {
		class: 'SimpleStrategy',
		replicationFactor: 1
	},
	idempotencyTTL: 86400
}
idempotency.initMiddleware(repoInitParams, "HeaderKeyName")
	.then(() => {

		console.log('Done');
		// registerPreProcessor();

		// registerPostProcessor();

		// processRequest();

		// saveIdempotentProcessorResponse();

		// processResponse();
	})
	.catch((error) => {
		console.log('Failed to init idempotency.');
	});

console.log('Done');


function processRequest() {
	idempotency.processRequest({
		"headers": {
			"HeaderKeyName": "ThisIsKey1"
		},
		"url": "/payments/123",
		"method": "POST"
	}, null, function () {
		console.log('here is next');
	});
}

function saveIdempotentProcessorResponse() {
	//Regisreting Pre-Processor Event
	var context = {
		"idempotencyKey": "ThisIsKey1",
		"url": "/payments/123",
		"method": "POST",
		"processorResponse": {
			status_code: 200,
			body: "Resource created successfuly"
		},
		"proxyResponse": null
	};
	idempotency.saveIdempotentProcessorResponse(context)
		.then(() => {
			console.log('Done saveIdempotentProcessorResponse');
		})
		.catch((error) => {
			console.log('Failed saveIdempotentProcessorResponse');
		});
}

function registerPreProcessor() {
	//Regisreting Pre-Processor Event
	idempotency.registerPreProcessorFlowEvent(function (req, res, next) {
		console.log('inside Pre-Processor Event');
		next();
	});
}

function registerPostProcessor() {
	//Regisreting Pre-Processor Event
	idempotency.registerPostProcessorFlowFailedEvent(function (req, res, next) {
		console.log('inside POST-Processor Event');
		next();
	});
}

function processResponse() {
	idempotency.processResponse({
		"headers": {
			"HeaderKeyName": "ThisIsKey1"
		},
		"url": "/payments/123",
		"method": "POST"
	}, {
		"processorResponse": {
			"status_code": 200,
			"body": "Processor: Resource created.",
		},
		"statusCode": 201,
		"body": "Proxy: Resource created.",
	}, function () {
		console.log('here is next');
	});
}