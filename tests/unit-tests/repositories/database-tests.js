'use strict';

var sinon = require('sinon'),
	should = require('should'),
	chai = require('chai'),
	chai_as_promised = require('chai-as-promised'),
	chai_sinon = require('chai-sinon'),
	rewire = require('rewire');

var database = require('../../../data/database'),
	cassandra = require('../../../data/repositories/cassandra/cassandra-repo');

chai.use(chai_sinon);
chai.use(chai_as_promised);
var expect = chai.expect;
var assert = chai.assert;

describe('Database Repository Tests', function () {
	describe('init', function () {
		it('should reject and return error if the given params is null', function () {

			return database.init(null)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});
		it('should reject and return error if repo type is not provided', function () {
			var repoInitParams = {}

			return database.init(repoInitParams)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});
		it('should reject and return error if repo type is not supported', function () {

			var repoInitParams = {
				type: "NOT_SUPPORTED"
			}

			return database.init(repoInitParams)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).to.not.equal(null);
				});
		});

		it('should resolve and return initialized repo if a valid repo type provided', function () {

			var repoInitParams = {
				type: "cassandra"
			}
			var spy = sinon.stub(cassandra, 'init').resolves();

			return database.init(repoInitParams)
				.then(() => {
					expect(spy.called).to.be.true;
				});
		});
	});
});