class VariableHandler {
	constructor(compiler) {
		this.compiler = compiler;

		this.links = new Map();
		this.types = new Map();

		this.assigned = {
			A: 0,
			B: 0,
			C: 0,
			D: 0,
			E: 0,
			F: 0,
			G: 0,
			H: 0,
			I: 0,
			J: 0,
			K: 0,
			L: 0,
			M: 0,
			N: 0,
			O: 0,
			P: 0,
			Q: 0,
			R: 0,
			S: 0,
			T: 0,
			U: 0,
			V: 0,
			W: 0,
			X: 0,
			Y: 0,
			Z: 0,
		};
		this.using = 'A';
	}

	setUsing(v) {
		this.using = v;
	}

	declare(identifier, type) {
		if (!this.links.has(identifier)) {
			this.links.set(identifier, [this.using, this.registry]);
			this.types.set(identifier, type);
			this.registry++;
		}
		return this.links.get(identifier);
	}

	has(identifier) {
		return this.links.has(identifier);
	}

	get(identifier) {
		if (!this.links.has(identifier)) throw new Error(`Variable '${identifier}' is not defined`);
		return this.links.get(identifier);
	}

	getType(identifier) {
		if (!this.types.has(identifier)) throw new Error(`Variable '${identifier}' is not defined`);
		return this.types.get(identifier);
	}

	setVarType(identifier, type) {
		if (!this.types.has(identifier)) throw new Error(`Variable '${identifier}' is not defined`);
		if (this.types.get(identifier) !== 'var') throw new Error(`Cannot modify infer type for non var variable '${identifier}'`);
		this.types.set(identifier, type);
	}

	get registry() {
		return this.assigned[this.using];
	}

	set registry(value) {
		this.assigned[this.using] = value;
	}
}

module.exports = VariableHandler;
