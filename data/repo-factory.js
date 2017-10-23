var repoFactory = function () {

	var repository = this;

	var repoList = [{
			type: 'cassandra',
			source: './repositories/cassandra/cassandra-repo'
		},
		// To extend repositories, add its type and its source logic. For example:
		// {
		// 	type: 'mongo',
		//  source: '.repositories/mongo/mongo-repo'
		// }
	];

	repoList.forEach(function (repo) {
		repository[repo.type] = require(repo.source);
	});

}

module.exports = new repoFactory;