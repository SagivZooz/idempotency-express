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
	}
}
idempotency.initMiddleware("cassandra", repoInitParams, "HeaderKeyName");

//idempotency.processRequest({"headers": {"HeaderKeyName": "ThisIsKey1"}, "url": "/payments/123", "method": "POST"}, null, null);

// idempotency.processResponse({"headers": {"HeaderKeyName": "ThisIsKey1"}, "url": "/payments/123", "method": "POST"}, null, null);

console.log('Done');