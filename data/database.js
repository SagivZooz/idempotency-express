var repoFactory = require('./repo-factory');

class Database {

	constructor(repoType) {
		this.localRepo = repoFactory[repoType];
	}

	init(repoParams){
		return this.localRepo.init(repoParams);
	}

	openConnection() {
		return this.localRepo.openConnection();
	}

	getPreviousIdempotentFlow(idempotencyContext){
		return this.localRepo.getPreviousIdempotentFlow(idempotencyContext);
	}

	saveIdempotentFlow(idempotencyContext){
		return this.localRepo.saveIdempotentFlow(idempotencyContext);
	}

	closeConnection() {
		this.localRepo.closeConnection();
	}
}

module.exports = Database;