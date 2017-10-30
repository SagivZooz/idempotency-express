var _ = require('lodash');
var logger;
const REQUIRED_LOGGER_IMPLEMENTATIONS = ['trace', 'info', 'error'];

function initLogger(i_logger) {
	logger = i_logger;
}

function getLogger() {
	return logger;
}

function isLoggerImplementsReuiredFunctions(i_logger) {
	var result = _.every(REQUIRED_LOGGER_IMPLEMENTATIONS, (implementation) => {
		return typeof i_logger[implementation] === 'function';
	});
	return result;
}

function getRequiredImplementationMethods() {
	return REQUIRED_LOGGER_IMPLEMENTATIONS;
}

module.exports = {
	init: initLogger,
	getInstance: getLogger,
	isLoggerImplementsReuiredFunctions: isLoggerImplementsReuiredFunctions,
	getRequiredImplementationMethods: getRequiredImplementationMethods
};