'use strict';

var sinon = require('sinon'),
	should = require('should'),
	chai = require('chai'),
	chai_as_promised = require('chai-as-promised'),
	chai_sinon = require('chai-sinon'),
	rewire = require('rewire');

var repo = require('../../../data/repositories/cassandra/cassandra-repo');

chai.use(chai_sinon);
chai.use(chai_as_promised);
var expect = chai.expect;
var assert = chai.assert;

describe('Cassandra Repository Tests', function () {

	describe('init', function () {
		it('should rejected and returned error if contactPoints is null', function () {

			var params = {}

			return repo.init(params)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});
		it('should rejected and returned error if contactPoints is invalid argument', function () {

			var params = {
				contactPoints: {
					a: "a"
				}
			};

			return repo.init(params)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});
		it('should rejected and returned error if no contactPoints was provided', function () {

			var params = {
				contactPoints: []
			};

			return repo.init(params)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});

		it('should rejected and returned error if user is null', function () {

			var params = {
				contactPoints: ['contactPoint']
			};

			return repo.init(params)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});
		it('should rejected and returned error if user is empty', function () {

			var params = {
				contactPoints: ['contactPoint'],
				user: ""
			};

			return repo.init(params)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});

		it('should rejected and returned error if password is null', function () {

			var params = {
				contactPoints: ['contactPoint'],
				user: "user"
			};

			return repo.init(params)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});
		it('should rejected and returned error if password is empty', function () {

			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: ""
			};

			return repo.init(params)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});

		it('should rejected and returned error if keyspace is null', function () {

			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password"
			};

			return repo.init(params)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});
		it('should rejected and returned error if keyspace is empty', function () {

			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password"
			};

			return repo.init(params)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});

		it('should resolve repository params are valid', function () {

			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.catch((error) => {
					throw new Error('Expected method to resolved.');
				});
		});

		//Handle environment creation
		// it.only('should call environment creation if the \'environmentCreation\' set to true', function () {
		// });
	});

	describe('openConnection', function () {
		it('should call client Connect method', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var clientStub = sinon.stub(client, "connect").resolves();

					repo.openConnection();
					expect(clientStub.called).to.equal(true);
					clientStub.restore();
				});
		});
		it('should return resolve on client connected successfuly', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var clientStub = sinon.stub(client, "connect").resolves();

					repo.openConnection()
						.then(function () {
							clientStub.restore();
						})
						.catch(function () {
							throw new Error('Expected method to resolve.');
						});
				});
		});
		it('should return reject on client failed to connect', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var clientStub = sinon.stub(client, "connect").rejects();

					repo.openConnection()
						.then(function () {
							throw new Error('Expected method to reject');
						})
						.catch(function () {
							clientStub.restore();
						});
				});
		});
	});

	describe('getPreviousIdempotentFlow', function () {
		it('should return resolve on successful execution', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var clientStub = sinon.stub(client, "execute").resolves();

					repo.getPreviousIdempotentFlow({
							idempotencyKey: "",
							url: "",
							method: ""
						})
						.then(function () {
							clientStub.restore();
						})
						.catch(function () {
							throw new Error('Expected method to resolve.');
						});
				});
		});
		it('should return reject if execution failed', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var clientStub = sinon.stub(client, "execute").rejects();

					repo.getPreviousIdempotentFlow({
							idempotencyKey: "",
							url: "",
							method: ""
						})
						.then(function () {
							throw new Error('Expected method to reject.');
						})
						.catch(function (error) {
							expect(error).to.not.equal(null);
							clientStub.restore();
						});
				});
		});
	});

	describe('createIdempotentFlowRecord', function () {
		it('should return resolve on successful execution', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var result = {
						rows: [{
							'obj': "obj",
							'[applied]': true
						}]
					};
					var clientStub = sinon.stub(client, "execute").resolves(result);

					repo.createIdempotentFlowRecord({
							idempotencyKey: "",
							url: "",
							url: ""
						})
						.then(function () {
							clientStub.restore();
						})
						.catch(function () {
							throw new Error('Expected method to resolve.');
						});
				});
		});
		it('should return resolve created:\'true\' if record created', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var result = {
						rows: [{
							'obj': "obj",
							'[applied]': true
						}]
					};
					var clientStub = sinon.stub(client, "execute").resolves(result);

					repo.createIdempotentFlowRecord({
							idempotencyKey: "",
							url: "",
							url: ""
						})
						.then(function (result) {
							expect(result.created).to.equal(true);
							clientStub.restore();
						})
						.catch(function () {
							throw new Error('Expected method to resolve.');
						});
				});
		});
		it('should return resolve created:\'false\' if record already exist', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var result = {
						rows: [{
							'obj': "obj",
							'[applied]': false
						}]
					};
					var clientStub = sinon.stub(client, "execute").resolves(result);

					repo.createIdempotentFlowRecord({
							idempotencyKey: "",
							url: "",
							url: ""
						})
						.then(function (result) {
							expect(result.created).to.deep.equal(result.rows[0])
							clientStub.restore();
						})
						.catch(function () {
							throw new Error('Expected method to resolve.');
						});
				});
		});
		it('should return reject if execution failed', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var clientStub = sinon.stub(client, "execute").rejects();

					repo.createIdempotentFlowRecord({
							idempotencyKey: "",
							url: "",
							url: ""
						})
						.then(function () {
							throw new Error('Expected method to resolve.');
						})
						.catch(function (error) {
							expect(error).to.not.equal(null);
							clientStub.restore();
						});
				});
		});
	});

	describe('saveIdempotentFlow', function () {
		it('should return resolve on successful execution', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var clientStub = sinon.stub(client, "execute").resolves();

					repo.saveIdempotentFlow({
							processorResponse: "",
							proxyResponse: "",
							idempotencyKey: "",
							url: "",
							method: ""
						})
						.then(function () {
							clientStub.restore();
						})
						.catch(function () {
							throw new Error('Expected method to resolve.');
						});
				});
		});
		it('should return reject if execution failed', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var clientStub = sinon.stub(client, "execute").rejects();

					repo.saveIdempotentFlow({
							processorResponse: "",
							proxyResponse: "",
							idempotencyKey: "",
							url: "",
							method: ""
						})
						.then(function () {
							throw new Error('Expected method to reject.');
						})
						.catch(function (error) {
							expect(error).to.not.equal(null);
							clientStub.restore();
						});
				});
		});
	});

	describe('saveIdempotentProcessorResponse', function () {
		it('should return resolve on successful execution', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var clientStub = sinon.stub(client, "execute").resolves();

					repo.saveIdempotentProcessorResponse({
							processorResponse: "",
							proxyResponse: "",
							idempotencyKey: "",
							url: "",
							method: ""
						})
						.then(function () {
							clientStub.restore();
						})
						.catch(function () {
							throw new Error('Expected method to resolve.');
						});
				});
		});
		it('should return reject if execution failed', function () {
			var params = {
				contactPoints: ['contactPoint'],
				user: "user",
				password: "password",
				keyspaceName: "keyspace"
			};

			return repo.init(params)
				.then((error) => {
					var client = repo.getClient();
					var clientStub = sinon.stub(client, "execute").rejects();

					repo.saveIdempotentProcessorResponse({
							processorResponse: "",
							proxyResponse: "",
							idempotencyKey: "",
							url: "",
							method: ""
						})
						.then(function () {
							throw new Error('Expected method to reject.');
						})
						.catch(function (error) {
							expect(error).to.not.equal(null);
							clientStub.restore();
						});
				});
		});
	});
});