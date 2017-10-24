var repoFactory = require('./repo-factory');

class Database {

	constructor(repoType) {
		this.localRepo = repoFactory[repoType];
	}

	init(repoParams) {
		return this.localRepo.init(repoParams);
	}

	openConnection() {
		return this.localRepo.openConnection();
	}

	getPreviousIdempotentFlow(idempotencyContext) {
		return this.localRepo.getPreviousIdempotentFlow(idempotencyContext);
	}

	createIdempotentFlowRecord(idempotencyContext) {
		return this.localRepo.createIdempotentFlowRecord(idempotencyContext);
	}

	saveIdempotentFlow(idempotencyContext) {
		return this.localRepo.saveIdempotentFlow(idempotencyContext);
	}
	saveIdempotentProcessorResponse(idempotencyContext) {
		return this.localRepo.saveIdempotentProcessorResponse(idempotencyContext);
	}

	closeConnection() {
		this.localRepo.closeConnection();
	}
}

module.exports = Database;