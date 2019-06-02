const Enums = require('./Enums');

class Type {
	constructor(name, ...resolvable) {
		this.name = name;
		this.isEnum = name.startsWith('enum-');
		this.isDynamic = !!resolvable && resolvable.length === 1 && resolvable[0] === true;
		if (this.isEnum) this.resolvable = resolvable;
		else this.resolvable = resolvable.concat('dynamic');
	}

	canResolve(type) {
		if (this.isDynamic) return true;
		return this.name === type || this.resolvable.includes(type) || this.resolvable.find(e => e[0] === type);
	}

	resolve({ type, value }) {
		if (!this.canResolve(type.name)) throw new Error(`Cannot convert '${type.name}' to '${this.name}' implicitly`);
		if (type.name === this.name || type.isDynamic) return value;
		const resolver = this.resolvable.find(e => e[0] === type.name);
		if (!resolver) return value;
		return resolver[1](value);
	}
}

const types = {
	dynamic: new Type('dynamic', true),
	void: new Type('void'),
	player: new Type('player'),
	number: new Type('number'),
	vector: new Type('vector', ['player', v => `Position Of(${v})`]),
	boolean: new Type('boolean'),
};

Object.keys(Enums).forEach(e => {
	types[`enum-${e}`] = new Type(`enum-${e}`);
});

module.exports = types;
