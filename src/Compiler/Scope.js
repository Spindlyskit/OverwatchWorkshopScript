const VariableHandler = require('./VariableHandler');

class Enviroment extends VariableHandler {
	constructor(compiller, parent) {
		super(compiller);
		this.parent = parent;
		if (parent) this.using = parent.using;
	}

	lookup(identifier) {
		let scope = this;
		while (scope) {
			if (scope.links.has(identifier)) return scope;
			scope = scope.parent;
		}
	}
}

module.exports = Enviroment;
