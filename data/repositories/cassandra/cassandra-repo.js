module.exports = {
	init: init,
	getClient: getClient,
	openConnection: openConnection,
	getPreviousIdempotentFlow: getPreviousIdempotentFlow,
	createIdempotentFlowRecord: createIdempotentFlowRecord,
	saveIdempotentFlow: saveIdempotentFlow,
	saveIdempotentProcessorResponse: saveIdempotentProcessorResponse
}

var cassandra = require('cassandra-driver');
var logger = require('../../../logger-wrapper');

var initParams, client, idempotencyTTL;
var queryOptions = {
	prepare: true
};


/*
Initializations
*/

function getClient() {
	return client;
}

function init(params) {

	//TODO: add log -> initiate cassandra connection
	logger.getInstance().trace('Initializing cassandra repository');

	return validateInputParams(params)
		.then(function (result) {
			initParams = result;

			if (initParams.environmentCreation === true) {
				logger.getInstance().trace('Creating (if not exist) cassandra environment');
				client = buildCassandraClient(null);
				return createCassandraEnvironment();
			} else {
				client = buildCassandraClient(initParams.keyspaceName);
				return Promise.resolve();
			}
		})
		.catch((error) => {
			var errorObj = {
				message: 'Failed to init cassandra repository',
				error: error
			}
			return Promise.reject(errorObj);
		});
}

function validateInputParams(params) {

	return new Promise(function (resolve, reject) {
		if (!params.contactPoints || !params.contactPoints.constructor === Array ||
			params.contactPoints.length <= 0) {
			//TODO: add log -> error
			return eject("Invalid or empty arguement was provided. [Argument name: contactPoints]");
		}
		if (!params.user || params.user == '') {
			//TODO: add log -> error
			return reject("Invalid or empty arguement was provided. [Argument name: user]");
		}
		if (!params.password || params.password == '') {
			//TODO: add log -> error
			return reject("Invalid or empty arguement was provided. [Argument name: password]");
		}
		if (!params.keyspaceName || params.keyspaceName == '') {
			//TODO: add log -> error
			return reject("Invalid or empty arguement was provided. [Argument name: keyspaceName]");
		}
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
		if (!params.idempotencyTTL) {
			//TODO: get this value from CONST/DEFAULT file
			params.idempotencyTTL = 86400;
		}
		idempotencyTTL = params.idempotencyTTL;

		resolve(params);
	});
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

	return executeQuery(query, null, {
			prepare: true
		})
		.then(() => {
			logger.getInstance().trace('Keyspace creation executed successfully.');
			return Promise.resolve();
		})
		.catch((error) => {
			var errorObj = {
				message: 'Failed to create cassandra environment [Keyspace].',
				error: error
			}
			return Promise.reject(errorObj);
		});
}

function createTypeIfNotExists() {

	var query = "CREATE TYPE IF NOT EXISTS response (status_code int, body text);";

	return executeQuery(query, null, {
			prepare: true
		})
		.then(() => {
			logger.getInstance().trace('Cassandra type creation executed successfully.');
			return Promise.resolve();
		})
		.catch((error) => {
			var errorObj = {
				message: 'Failed to create a cassandra type.',
				error: error
			}
			return Promise.reject(errorObj);
		});
}

function createTableIfNotExists() {

	//TODO: create the relevant table
	var query = "CREATE TABLE IF NOT EXISTS idempotent_responses(" +
		" idempotency_key text, method text, url text, proxy_response response, processor_response response," +
		" PRIMARY KEY (idempotency_key, method, url)) " +
		" WITH default_time_to_live = 86400;";

	return executeQuery(query, null, {
			prepare: true
		})
		.then(() => {
			logger.getInstance().trace('Table creation executed successfully.');
			return Promise.resolve();
		})
		.catch((error) => {
			var errorObj = {
				message: 'Failed to create the table.',
				error: error
			}
			return Promise.reject(errorObj);
		});
}

function openConnection() {

	return client.connect()
		.then(() => {
			logger.getInstance().trace('Connected to cassandra successfully.');
			return Promise.resolve();
		})
		.catch((error) => {
			var errorObj = {
				message: 'Failed to open connection against cassandra.',
				error: error
			}
			return Promise.reject(errorObj);
		});
}


/*
Idempotency methods
*/
function getPreviousIdempotentFlow(idempotencyContext) {

	logger.getInstance().trace('Getting idompotent flow. IdempotencyKey[' + idempotencyContext.idempotencyKey + ']');

	var query = 'SELECT * from idempotent_responses where idempotency_key=? and method=? and url=?';
	var queryParams = [idempotencyContext.idempotencyKey, idempotencyContext.url, idempotencyContext.url];

	return executeQuery(query, queryParams, queryOptions)
		.then((result) => {
			if (result.length == 0) {
				logger.getInstance().trace('No idempotency flow was founded. IdempotencyKey[' + idempotencyContext.idempotencyKey + ']');
				return Promise.resolve(null);
			}
			logger.getInstance().trace('A valid idempotency flow was founded. IdempotencyKey[' + idempotencyContext.idempotencyKey + ']');
			resolve(result[0]);
		})
		.catch((error) => {
			//TODO: logger.error -> failed to get idempotency flow
			return Promise.reject(error);
		});
}

function createIdempotentFlowRecord(idempotencyContext) {

	logger.getInstance().trace('Creating idempotent flow record in cassandra. IdempotencyKey[' + idempotencyContext.idempotencyKey + ']');

	var query = 'INSERT INTO idempotent_responses (idempotency_key, method, url) VALUES (?, ?, ?) IF NOT EXISTS USING TTL ?;';
	var queryParams = [idempotencyContext.idempotencyKey, idempotencyContext.method, idempotencyContext.url, idempotencyTTL];

	return executeQuery(query, queryParams, queryOptions)
		.then((result) => {
			var retValue;
			if (!isCreated(result[0])) {
				retValue = {
					created: false,
					record: result[0]
				};
			} else {
				retValue = {
					created: true
				};
			}

			return Promise.resolve(retValue);
		})
		.catch((error) => {
			//TODO: add log
			return Promise.reject(error);
		});
}

function saveIdempotentFlow(idempotencyContext) {

	logger.getInstance().trace('Saving idempotent flow in cassandra. IdempotencyKey[' + idempotencyContext.idempotencyKey + ']');

	var query = 'UPDATE idempotent_responses SET processor_response=?, proxy_response=?' +
		' WHERE idempotency_key=? and method=? and url=?;';
	var queryParams = [idempotencyContext.processorResponse, idempotencyContext.proxyResponse,
		idempotencyContext.idempotencyKey, idempotencyContext.method, idempotencyContext.url
	];

	return new Promise(function (resolve, reject) {
		client.execute(query, queryParams, queryOptions, function (error, result) {
			if (error) {
				reject(error);
			}
			resolve();
		});
	});
}

function saveIdempotentProcessorResponse(idempotencyContext) {
	logger.getInstance().trace('Saving idempotent processor response in cassandra. IdempotencyKey[' + idempotencyContext.idempotencyKey + ']');

	var query = 'UPDATE idempotent_responses SET processor_response=?' +
		' WHERE idempotency_key=? and method=? and url=?;';
	var queryParams = [idempotencyContext.processorResponse, idempotencyContext.idempotencyKey,
		idempotencyContext.method, idempotencyContext.url
	];

	return new Promise(function (resolve, reject) {
		client.execute(query, queryParams, queryOptions, function (err, result) {
			if (error) {
				reject(error);
			}
			resolve();
		});
	});
}

/*
handlers
*/
function executeQuery(query, params, options) {

	return client.execute(query, params, options)
		.then((result) => {
			return result.rows;
		})
		.catch((error) => {
			return Promise.reject(error);
		});
}

function isCreated(entry) {
	var applied = String(entry['[applied]']);
	return applied === 'true';
}