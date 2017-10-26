'use strict';

var sinon = require('sinon'),
	should = require('should'),
	chai = require('chai'),
	chai_as_promised = require('chai-as-promised'),
	chai_sinon = require('chai-sinon'),
	rewire = require('rewire');

var idempotency = require('../../../idempotency'),
	database = require('../../../data/database');

chai.use(chai_sinon);
chai.use(chai_as_promised);
var expect = chai.expect;
var assert = chai.assert;


describe('Idempotency Middleware Tests', function () {

	describe('initMiddleware', function () {

		it('should reject and return error if repoParams is not provided', function () {
			return idempotency.initMiddleware(null, "idemHeaderKeyName")
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});

		it('should reject and return error if idempotencyHeaderKeyName is not provided', function () {
			return idempotency.initMiddleware(null, null)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});

		it('should call the repo initialization if the given parameters are valid', function () {

			var dbInitStub = sinon.stub(database, "init").resolves();
			var dbOpenConnectionStub = sinon.stub(database, "openConnection").resolves();

			return idempotency.initMiddleware({}, "idemHeaderKeyName")
				.then(() => {
					expect(dbInitStub.called).to.equal(true);
					expect(dbOpenConnectionStub.called).to.equal(true);

					dbInitStub.restore();
					dbOpenConnectionStub.restore();
				})
		});

		it('should reject and return error if db initialization failed', function () {

			var dbInitStub = sinon.stub(database, "init").rejects();

			return idempotency.initMiddleware({}, "idemHeaderKeyName")
				.catch((error) => {
					expect(dbInitStub.called).to.equal(true);
					expect(error).to.not.equal(null);

					dbInitStub.restore();
				})
		});

		it('should reject and return error if db failed to open connection', function () {

			var dbInitStub = sinon.stub(database, "init").resolves();
			var dbOpenConnectionStub = sinon.stub(database, "openConnection").rejects();

			return idempotency.initMiddleware({}, "idemHeaderKeyName")
				.catch((error) => {
					expect(dbInitStub.called).to.equal(true);
					expect(dbOpenConnectionStub.called).to.equal(true);
					expect(error).to.not.equal(null);

					dbInitStub.restore();
					dbOpenConnectionStub.restore();
				})
		});
	});

	describe('registerPreProcessorFlowEvent', function () {
		it('should throw an error if an invalid callback was provided', function () {
			chai.expect(() => idempotency.registerPreProcessorFlowEvent(null)).to.throw('An invalid callback was provided')
		});
		it('should not throw an error if a valid callback was provided', function () {
			chai.expect(() => idempotency.registerPreProcessorFlowEvent(function () {}))
				.to.not.throw('An invalid callback was provided')
		});
	});

	describe('registerPostProcessorFlowFailedEvent', function () {
		it('should throw an error if an invalid callback was provided', function () {
			chai.expect(() => idempotency.registerPostProcessorFlowFailedEvent(null)).to.throw('An invalid callback was provided')
		});
		it('should not throw an error if a valid callback was provided', function () {
			chai.expect(() => idempotency.registerPostProcessorFlowFailedEvent(function () {}))
				.to.not.throw('An invalid callback was provided')
		});
	});

	describe('processRequest', function () {
		it('should throw an error if the given Request is null', function () {
			expect(() => {
				idempotency.processRequest(null, null, null)
			}).to.throw(Error);
		});
		it('should create an idempotency record if the given Request is valid', function () {
			var dbStub = sinon.stub(database, "createIdempotentFlowRecord").resolves();

			idempotency.processRequest({
				"headers": {
					"HeaderKeyName": "ThisIsKey1"
				},
				"url": "/payments/123",
				"method": "POST"
			}, null, null);

			expect(dbStub.called).to.equal(true);

			dbStub.restore();
		});
		it('should call \'PreProcessor\' event if it was registered', function (done) {
			var dbStub = sinon.stub(database, "createIdempotentFlowRecord").resolves();
			var preProcessorEvent = function (req, res, next) {

			};
			var eventStub = sinon.spy(preProcessorEvent);

			idempotency.registerPreProcessorFlowEvent(eventStub);
			idempotency.processRequest({
				"headers": {
					"HeaderKeyName": "ThisIsKey1"
				},
				"url": "/payments/123",
				"method": "POST"
			}, null, null);

			setTimeout(function () {
				expect(eventStub.called).to.equal(true);
				dbStub.restore();
				idempotency = rewire('../../../idempotency');
				done();
			}, 10);
		});
		it('should NOT call \'PreProcessor\' event if it was registered', function (done) {
			var dbStub = sinon.stub(database, "createIdempotentFlowRecord").resolves();
			var preProcessorEvent = function (req, res, next) {

			};
			var eventStub = sinon.spy(preProcessorEvent);

			idempotency.processRequest({
				"headers": {
					"HeaderKeyName": "ThisIsKey1"
				},
				"url": "/payments/123",
				"method": "POST"
			}, null, null);

			setTimeout(function () {
				expect(eventStub.called).to.equal(false);
				dbStub.restore();
				done();
			}, 10);
		});
		it('should call next function if it is the first request in the middleware', function (done) {
			var dbStub = sinon.stub(database, "createIdempotentFlowRecord").resolves({
				created: true
			});
			var nextEvent = function () {};
			var eventStub = sinon.spy(nextEvent);

			idempotency.processRequest({
				"headers": {
					"HeaderKeyName": "ThisIsKey1"
				},
				"url": "/payments/123",
				"method": "POST"
			}, null, eventStub);

			setTimeout(function () {
				expect(eventStub.called).to.equal(true);
				dbStub.restore();
				done();
			}, 10);
		});
		it('should Not call next function if it is NOT the first request in the middleware', function (done) {
			var dbStub = sinon.stub(database, "createIdempotentFlowRecord").resolves({
				created: false
			});
			var nextEvent = function () {};
			var eventStub = sinon.spy(nextEvent);

			idempotency.processRequest({
				"headers": {
					"HeaderKeyName": "ThisIsKey1"
				},
				"url": "/payments/123",
				"method": "POST"
			}, null, eventStub);

			setTimeout(function () {
				expect(eventStub.called).to.equal(false);
				dbStub.restore();
				done();
			}, 10);
		});
		it('should return proxy response if there is a saved response belong to this idempotency key', function (done) {
			var returnedResponse = {
				created: false,
				record: {
					proxy_response: {
						status_code: 200,
						body: "response body"
					}
				}
			};
			var dbStub = sinon.stub(database, "createIdempotentFlowRecord").resolves(returnedResponse);
			var nextEvent = function () {};
			var nextEventStub = sinon.spy(nextEvent);

			var resStatusFunction = sinon.spy();
			var resJsonFunction = sinon.spy();
			var res = {
				status: resStatusFunction,
				json: resJsonFunction
			}

			idempotency.processRequest({
				"headers": {
					"HeaderKeyName": "ThisIsKey1"
				},
				"url": "/payments/123",
				"method": "POST"
			}, res, nextEventStub);

			setTimeout(function () {
				expect(nextEventStub.called).to.equal(false);
				expect(resStatusFunction.called).to.equal(true);
				expect(resStatusFunction.getCall(0).args[0]).to.equal(returnedResponse.record.proxy_response.status_code);
				expect(resJsonFunction.called).to.equal(true);
				expect(resJsonFunction.getCall(0).args[0]).to.equal(returnedResponse.record.proxy_response.body);
				dbStub.restore();
				done();
			}, 10);
		});
		it('should call \'PostProcessor\' event if it was registered', function (done) {
			var returnedResponse = {
				created: false,
				record: {
					processor_response: {
						status_code: 200,
						body: "response body"
					}
				}
			};
			var dbStub = sinon.stub(database, "createIdempotentFlowRecord").resolves(returnedResponse);
			var postProcessorEvent = sinon.spy();

			idempotency.registerPostProcessorFlowFailedEvent(postProcessorEvent);

			idempotency.processRequest({
				"headers": {
					"HeaderKeyName": "ThisIsKey1"
				},
				"url": "/payments/123",
				"method": "POST"
			}, null, null);

			setTimeout(function () {
				expect(postProcessorEvent.called).to.equal(true);
				dbStub.restore();
				idempotency = rewire('../../../idempotency');
				done();
			}, 10);
		});
		it('should return error if there is a uncompleted saved response belong to this idempotency key', function (done) {
			var returnedResponse = {
				created: false,
				record: {
					processor_response: {
						status_code: 200,
						body: "response body"
					}
				}
			};
			var dbStub = sinon.stub(database, "createIdempotentFlowRecord").resolves(returnedResponse);
			var nextEvent = function () {};
			var nextEventStub = sinon.spy(nextEvent);

			var resStatusFunction = sinon.spy();
			var resJsonFunction = sinon.spy();
			var res = {
				status: resStatusFunction,
				json: resJsonFunction
			}

			idempotency.processRequest({
				"headers": {
					"HeaderKeyName": "ThisIsKey1"
				},
				"url": "/payments/123",
				"method": "POST"
			}, res, nextEventStub);

			setTimeout(function () {
				expect(nextEventStub.called).to.equal(false);
				expect(resStatusFunction.called).to.equal(true);
				expect(resStatusFunction.getCall(0).args[0]).to.equal(409);
				expect(resJsonFunction.called).to.equal(true);
				expect(resJsonFunction.getCall(0).args[0].error).to.equal("Failed to operate request during to idempotency key");
				dbStub.restore();
				done();
			}, 10);
		});
	});

	describe('processResponse', function () {
		it('should throw an error if the given Request is null', function () {
			expect(() => {
				idempotency.processResponse(null, null, null)
			}).to.throw(Error);
		});

		it('should save response in db if its valid request and response', function () {

			var dbSpy = sinon.stub(database, 'saveIdempotentFlow').resolves();
			var res = {
				processorResponse: {
					status_code: 200,
					body: "processor response"
				},
				statusCode: 201,
				_body: "proxy response"
			}

			idempotency.processResponse({
				"headers": {
					"HeaderKeyName": "ThisIsKey1"
				},
				"url": "/payments/123",
				"method": "POST"
			}, res, null);

			var result = {
				idempotencyKey: undefined,
				url: '/payments/123',
				method: 'POST',
				processorResponse: {
					status_code: 200,
					body: 'processor response'
				},
				proxyResponse: {
					status_code: 201,
					body: 'proxy response'
				}
			}

			setTimeout(function () {;
				expect(dbSpy.called).to.equal(true);
				expect(dbSpy.getCall(0).args[0]).to.deep.equal(result);
				done();
			}, 10);
		});
	});

	describe('saveIdempotentProcessorResponse', function () {
		it('should reject and return an error if the given context is null', function () {
			return idempotency.saveIdempotentProcessorResponse(null)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});

		it('should resolve if context saved successfuly in db', function () {

			var dbInitStub = sinon.stub(database, "saveIdempotentProcessorResponse").resolves();

			return idempotency.saveIdempotentProcessorResponse({})
				.then(() => {
					expect(dbInitStub.called).to.equal(true);

					dbInitStub.restore();
				})
				.catch((error) => {
					throw new Error('Expected method to resolve.');
				});
		});

		it('should reject if context failed to be saved in db', function () {

			var dbInitStub = sinon.stub(database, "saveIdempotentProcessorResponse").rejects();

			return idempotency.saveIdempotentProcessorResponse({})
				.then(() => {
					throw new Error('Expected method to resolve.');
				})
				.catch((error) => {
					expect(dbInitStub.called).to.equal(true);

					dbInitStub.restore();
				});
		});
	});
});
