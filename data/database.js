var repoFactory = require('./repo-factory');
var supportedRepos = require('./repo-types');

var localRepo;

function init(repoParams) {
	if (!(repoParams)) {
		return Promise.reject("Repository params was not provided.");
	}
	if (!validateTypeIsSupported(repoParams.type)) {
		return Promise.reject("Repository type was not provided or not supported.");
	}
	localRepo = repoFactory[repoParams.type];
	return localRepo.init(repoParams);
}

function openConnection() {
	return localRepo.openConnection();
}

function getPreviousIdempotentFlow(idempotencyContext) {
	return localRepo.getPreviousIdempotentFlow(idempotencyContext);
}

function createIdempotentFlowRecord(idempotencyContext) {
	return localRepo.createIdempotentFlowRecord(idempotencyContext);
}

function saveIdempotentFlow(idempotencyContext) {
	return localRepo.saveIdempotentFlow(idempotencyContext);
}

function saveIdempotentProcessorResponse(idempotencyContext) {
	return localRepo.saveIdempotentProcessorResponse(idempotencyContext);
}

function validateTypeIsSupported(repoType) {
	if (!supportedRepos.includes(repoType)) {
		return false;
	}
	return true;
}

module.exports = {
	init: init,
	openConnection: openConnection,
	getPreviousIdempotentFlow: getPreviousIdempotentFlow,
	createIdempotentFlowRecord: createIdempotentFlowRecord,
	saveIdempotentFlow: saveIdempotentFlow,
	saveIdempotentProcessorResponse: saveIdempotentProcessorResponse,
};