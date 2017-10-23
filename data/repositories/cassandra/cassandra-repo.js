module.exports = {
	init: init,
	openConnection: openConnection,
	closeConnection: closeConnection,
	getPreviousIdempotentFlow: getPreviousIdempotentFlow,
	saveIdempotentFlow: saveIdempotentFlow
}

var cassandra = require('cassandra-driver');

var initParams, client;
var queryOptions = {
	prepare: true
};

/*
Initializations
*/
function init(params) {

	//TODO: add log -> initiate cassandra connection
	console.log('Initializing cassandra connection');

	initParams = validateParamsInput(params);

	if (initParams.environmentCreation) {
		client = buildCassandraClient(null);
		return createCassandraEnvironment();
	} else {
		client = buildCassandraClient(initParams.keyspaceName);
		return Promise.resolve();
	}
}

function validateParamsInput(params) {

	//TODO: check input and throw exception if values are missing or bad.

	//Set default values if is not defined
	if (!params.queryOptions) {
		params.queryOptions = {
			consistency: cassandra.types.consistencies.quorum,
		}
		queryOptions.consistency = cassandra.types.consistencies.quorum;
	} else {
		queryOptions.consistency = params.queryOptions
	}
	if (!params.policies) {
		params.policies = {
			reconnection: new cassandra.policies.reconnection.ConstantReconnectionPolicy(1000)
		}
	}
	if (!params.keyspaceReplication) {
		params.keyspaceReplication = {
			class: 'SimpleStrategy',
			replicationFactor: 3
		}
	}
	if (!params.keyspaceReplication.class) {
		params.keyspaceReplication.class = 'SimpleStrategy';
	}
	if (!params.keyspaceReplication.replicationFactor) {
		params.keyspaceReplication.replicationFactor = 3;
	}

	return params;
}

function buildCassandraClient(keyspace) {
	var cassandraClient = new cassandra.Client({
		contactPoints: initParams.contactPoints,
		authProvider: new cassandra.auth.PlainTextAuthProvider(initParams.username, initParams.password),
		queryOptions: {
			consistency: initParams.queryOptions
		},
		policies: {
			reconnection: new cassandra.policies.reconnection.ConstantReconnectionPolicy(1000)
		}
	});

	if (keyspace) {
		cassandraClient.keyspace = keyspace;
	}

	return cassandraClient;
}

function createCassandraEnvironment() {

	return createKeyspaceIfNotExists()
		.then(function () {
			client = buildCassandraClient(initParams.keyspaceName);
			return createTypeIfNotExists();
		})
		.then(function () {
			return createTableIfNotExists();
		});
}

function createKeyspaceIfNotExists() {

	var query = "CREATE KEYSPACE IF NOT EXISTS " +
		initParams.keyspaceName +
		" WITH replication = {'class': '" + initParams.keyspaceReplication.class + "', 'replication_factor':" +
		initParams.keyspaceReplication.replicationFactor + "}";

	// return new Promise(function (resolve, reject) {
	// 	client.execute(query, null, {
	// 		prepare: true
	// 	}, function (err) {
	// 		if (err) {
	// 			//TODO: add logger -> failed to execute keyspace creation operation
	// 			console.log('Failed to create a keyspace');
	// 			return reject(err);
	// 		} else {
	// 			//TODO: add logger -> keyspace creation operation executed successfuly
	// 			console.log('Keyspace creation executed successfully.');
	// 			return resolve();
	// 		}
	// 	});
	// });

	return executeQuery(query, null, {
			prepare: true
		})
		.then(() => {
			//TODO: add logger -> keyspace creation operation executed successfuly
			console.log('Keyspace creation executed successfully.');
			return Promise.resolve();
		})
		.catch((error) => {
			//TODO: add logger -> failed to execute keyspace creation operation
			console.log('Failed to create a keyspace');
			return Promise.reject(error);
		});
}

function createTypeIfNotExists() {

	var query = "CREATE TYPE IF NOT EXISTS response (status_code int, body text);";

	// return new Promise(function (resolve, reject) {
	// 	client.execute(query, null, {
	// 		prepare: true
	// 	}, function (err) {
	// 		if (err) {
	// 			//TODO: add logger -> failed to execute cassandra type creation operation
	// 			console.log('Failed to create a cassandra type');
	// 			return reject(err);
	// 		} else {
	// 			//TODO: add logger -> cassandra type creation operation executed successfuly
	// 			console.log('Cassandra type creation executed successfully.');
	// 			return resolve();
	// 		}
	// 	});
	// });

	return executeQuery(query, null, {
			prepare: true
		})
		.then(() => {
			//TODO: add logger -> cassandra type creation operation executed successfuly
			console.log('Cassandra type creation executed successfully.');
			return Promise.resolve();
		})
		.catch((error) => {
			//TODO: add logger -> failed to execute cassandra type creation operation
			console.log('Failed to create a cassandra type');
			return Promise.reject(error);
		});
}

function createTableIfNotExists() {

	//TODO: create the relevant table
	var query = "CREATE TABLE IF NOT EXISTS idempotent_responses(" +
		" idempotency_key text, method text, url text, proxy_response response, processor_response response," +
		" PRIMARY KEY (idempotency_key, method, url)) " +
		" WITH default_time_to_live = 86400;";

	// return new Promise(function (resolve, reject) {
	// 	client.execute(query, null, {
	// 		prepare: true
	// 	}, function (err) {
	// 		if (err) {
	// 			//TODO: add logger -> failed to execute table creation operation
	// 			console.log('Failed to create the table');
	// 			return reject(err);
	// 		} else {
	// 			//TODO: add logger -> table creation operation executed successfuly
	// 			console.log('Table creation executed successfully.');
	// 			return resolve();
	// 		}
	// 	});
	// });

	return executeQuery(query, null, {
			prepare: true
		})
		.then(() => {
			//TODO: add logger -> table creation operation executed successfuly
			console.log('Table creation executed successfully.');
			return Promise.resolve();
		})
		.catch((error) => {
			//TODO: add logger -> failed to execute table creation operation
			console.log('Failed to create the table');
			return Promise.reject(err);
		});
}

function openConnection() {

	return client.connect()
		.then(() => {
			//TODO: add log -> Connected to cassandra successfully
			console.log('Connected to cassandra successfully');
			return Promise.resolve();
		})
		.catch((error) => {
			//TODO: add log -> Failed connecting to cassandra
			// return Promise.reject(new Error('SERVICE_UNAVAILABLE'));
			return Promise.reject(error);
		});
}

function closeConnection() {
	console.log('Closing connection against cassandra');
}


/*
Idempotency methods
*/
function getPreviousIdempotentFlow(idempotencyContext) {

	//TODO: add log -> looking for idempotency key inside cassandra
	var query = 'SELECT * from idempotent_responses where idempotency_key=? and method=? and url=?';
	var queryParams = [idempotencyContext.idempotencyKey, idempotencyContext.endpoint, idempotencyContext.method];

	return new Promise(function (resolve, reject) {
		client.execute(query, queryParams, queryOptions, function (err, result) {
			if (err) {
				//TODO: Add log -> failed to get idempotency flow
				reject(err);
			}
			if (result.rows.length == 0) {
				//TODO: Add log -> No idempotency flow was founded
				resolve(null);
			}
			//TODO: Add log -> a valid idempotency flow was founded
			resolve(result.rows[0]);
		});
	});
}

function saveIdempotentFlow(idempotencyContext) {

	//TODO: add log -> looking for idempotency key inside cassandra
	var query = 'UPDATE idempotent_responses SET processor_response=?, proxy_response=?' +
		' WHERE idempotency_key=? and method=? and url=?;';
	// var queryParams = [idempotencyContext.processorResponse, idempotencyContext.proxyResponse,
	// 	idempotencyContext.idempotencyKey, idempotencyContext.method, idempotencyContext.endpoint
	// ];
	var queryParams = [{
			status_code: 1,
			body: null
		}, {
			status_code: null,
			body: null
		},
		idempotencyContext.idempotencyKey, idempotencyContext.method, idempotencyContext.endpoint
	];


	return new Promise(function (resolve, reject) {
		client.execute(query, queryParams, queryOptions, function (err, result) {
			if (err) {
				//TODO: Add log -> failed to save idempotency flow
				console.log(err.message);
				reject(err);
			}
			//TODO: Add log -> a valid idempotency flow was saved
			resolve();
		});
	});
}


function executeQuery(query, params, options) {

	//TODO: add tracing
	return client.execute(query, params, options)
		.then((result) => {
			//TODO: Add log -> Trace
			return result.rows;
		})
		.catch((error) => {
			//TODO: Add log -> query rejected
			return Promise.reject(new Error(getCassandraError(error)));
		});
}