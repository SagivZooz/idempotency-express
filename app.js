var idempotency = require('./idempotency.js')

var repoInitParams = {
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
idempotency.initMiddleware("cassandra", repoInitParams, "HeaderKeyName")
	.then(() => {


		// //Regisreting Pre-Processor Event
		// idempotency.registerPreProcessorFlowEvent(function (req, res, next) {
		// 	console.log('inside Pre-Processor Event');
		// 	next();
		// });

		//Process request
		idempotency.processRequest({
			"headers": {
				"HeaderKeyName": "ThisIsKey1"
			},
			"url": "/payments/123",
			"method": "POST"
		}, null, function () {
			console.log('here is next');
		});

		//saveIdempotentProcessorResponse();

		//Process response
		// idempotency.processResponse({
		// 	"headers": {
		// 		"HeaderKeyName": "ThisIsKey1"
		// 	},
		// 	"url": "/payments/123",
		// 	"method": "POST",
		// 	"": ""
		// }, {
		// 	"headers": {
		// 		"HeaderKeyName": "ThisIsKey1"
		// 	},
		// 	"statusCode": 200,
		// 	"body": "Proxy: Resource created.",
		// }, function () {
		// 	console.log('here is next');
		// });

	})
	.catch((err) => {
		console.log('Failed to init middleware');
	});

console.log('Done');





function saveIdempotentProcessorResponse() {
	//Regisreting Pre-Processor Event
	var context = {
		"idempotencyKey": "ThisIsKey1",
		"endpoint": "/payments/123",
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