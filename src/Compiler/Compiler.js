const VariableHandler = require('./VariableHandler');
const Enviroment = require('./Scope');
const Enums = require('../Elements/Enums');
const { actions } = require('../Elements/Actions');
const { values } = require('../Elements/Values');
const types = require('../Elements/Types');
const CompiledNode = require('./CompiledNode');

// Used when no code is needed in the final compiled file
const nodeVoid = new CompiledNode(types.void);
const nodeFalse = new CompiledNode(types.boolean, 'false');

class Compiler {
	constructor(ast) {
		// The syntax tree from the compiler
		this.ast = ast;

		// Mappings of identifiers to workshop variable indexes
		this.playerVars = new VariableHandler();
		this.globalEnv = new Enviroment();

		// The current enviroment for global vars
		this.env = this.globalEnv;

		// Mapping of identifiers to compile-time constant values
		this.constants = new Map();

		// Identifiers that cannot be declared as they are built in methods
		this.identifiers = Object.keys(types)
			.concat(Object.keys(actions))
			.concat(Object.keys(values))
			.concat(Object.keys(Enums));

		// Ensure this always refers to the compiler in compile functions
		this.compile = this._compile.bind(this);
		this.compileAction = this._compileAction.bind(this);
		this.compileValue = this._compileValue.bind(this);
	}

	dispatch() {
		return this.compile(this.ast).value.filter(e => typeof e === 'string').join('\n\n');
	}

	// Compile a node node in an action or value/condition block
	_compile(node) {
		switch (node.type) {
			case 'block':
				return this.compileBlock(node, this.compile);
			case 'const':
				this.constants.set(node.name, this.compileValue(node.value));
				return nodeVoid;
			case 'declare':
				this.compileDeclare(node);
				return nodeVoid;
			case 'rule':
				return this.compileRule(node);
			case 'usevar':
				if (node.scope === 'global') this.env.setUsing(node.var);
				else if (node.scope === 'player') this.playerVars.setUsing(node.var);
				else throw new Error(`Invalid scope '${node.scope}' for usevar`);
				return nodeVoid;
		}
	}

	// Compile an action (call that does not refer to a value)
	_compileAction(node) {
		switch (node.type) {
			case 'assign':
				return this.compileAssign(node);
			case 'block':
				return this.compileBlock(node, this.compileAction);
			case 'call':
				return this.compileCall(node, actions);
			case 'declare':
				return this.compileDeclare(node);
			case 'usevar':
				if (node.scope === 'global') this.env.setUsing(node.var);
				else if (node.scope === 'player') this.playerVars.setUsing(node.var);
				else throw new Error(`Invalid scope '${node.scope}' for usevar`);
				return nodeVoid;
		}
		throw new Error(`Expected an action but recieved ${node.type}`);
	}

	// Compile a value (can be stored in variables or passed as arguments)
	_compileValue(node) {
		if (!node) return;
		switch (node.type) {
			case 'block':
				return this.compileBlock(node, this.compileValue);
			case 'call':
				return this.compileCall(node, values);
			case 'enum':
				return this.compileEnum(node);
			case 'not':
				return this.compileNot(node);
			case 'number':
				return new CompiledNode(types.number, node.value);
			case 'boolean':
				return new CompiledNode(types.boolean, node.value);
			case 'player':
				return new CompiledNode(types.player, 'Event Player');
			case 'id':
				return this.compileIdentifier(node, this.env);
		}
	}

	compileCondition(node) {
		if (node.type !== 'binary') throw new Error('Expected a binary comparison as a condition');

		const left = this.compileValue(node.left) || nodeFalse;
		const operator = node.operator;
		if (!['==', '!=', '<', '<=', '>', '>='].includes(operator)) throw new Error(`Invalid condition operator '${operator}'`);
		const right = this.compileValue(node.right) || nodeFalse;

		return new CompiledNode(types.boolean, `${left.value} ${operator} ${right.value}`);
	}

	compileBlock(node, compileFunction) {
		return new CompiledNode(types.void, node.block.map(e => {
			e = compileFunction(e);
			return e && e.value ? e.value : null;
		}));
	}

	compileCall(node, provider) {
		const call = node.call;
		if (call.type !== 'id') throw new Error(`${call.type} '${call.value}' cannot be called`);

		if (!provider.hasOwnProperty(call.value)) throw new Error(`Method '${call.value}' could not be found`);
		const method = provider[call.value];

		let scope = nodeVoid;
		if (node.scope) scope = this.compileValue(node.scope);
		if (!scope) throw new Error(`Could not resolve ${call.scope.value} as context for call to ${call.value}`);
		if (node.scope && !scope.value) throw new Error(`Could not find method ${call.value} of null`);

		let args = [];
		if (scope !== nodeVoid) args.push(scope);
		args.push(...node.args.map(this.compileValue));
		if (args.includes(undefined) || args.includes(nodeVoid)) throw new Error(`One or more arguments return void`);
		args = args.map((arg, i) => {
			const requiredType = method.args[i];
			if (!types[requiredType].canResolve(arg.type.name)) {
				throw new Error(`Method '${call.value}' expected '${requiredType}' but got '${arg.type.name}'`);
			}
			return types[requiredType].resolve(arg);
		});
		return new CompiledNode(method.returns || nodeVoid, method.map(this.env, args));
	}

	compileEnum(node) {
		const enumName = node.enum;
		const keyName = node.value;
		const enumObj = Enums[enumName];
		if (!enumObj) throw new Error(`Could not find enum '${enumName}'`);
		if (!enumObj[keyName]) throw new Error(`Could not find value '${enumName}.${keyName}'`);
		return new CompiledNode(types[`enum-${enumName}`], enumObj[keyName]);
	}

	compileNot(node) {
		const right = this.compileValue(node.right);
		if (!right.value) throw new Error('Right side of negation operation did not resolve to a value');
		if (!types.boolean.canResolve(right.type.name)) {
			throw new Error(`Negation operator expected 'boolean' but got '${right.type.name}'`);
		}
		return new CompiledNode(types.boolean, `Not(${right.value})`);
	}

	// This function is actually fairly straightforward, just big to deal with indents and the like
	compileRule(node) {
		this.env = new Enviroment(this, this.env);
		const target = Enums.Event[node.target];
		if (!target) throw new Error(`Could not find Event target 'Event.${node.target}'`);
		const lines = [];
		lines.push(`rule("${node.name}")`);
		lines.push('{');
		lines.push(1);

		lines.push('event');
		lines.push('{');
		lines.push(1);
		lines.push(`${target};`);
		if (node.target !== 'global') {
			lines.push('All;');
			lines.push('All;');
		}
		lines.push(-1);
		lines.push('}');

		lines.push(null);

		if (node.conditions) {
			lines.push('conditions');
			lines.push('{');
			lines.push(1);
			lines.push(...node.conditions.map(value => `${this.compileCondition(value).value};`).filter(e => e));
			lines.push(-1);
			lines.push('}');
		}

		lines.push('actions');
		lines.push('{');
		lines.push(1);
		lines.push(...node.actions.map(action => `${this.compileAction(action).value};`).filter(e => e));
		lines.push(-1);
		lines.push('}');

		lines.push(-1);
		lines.push('}');

		this.env = this.env.parent;

		return new CompiledNode(types.void, this.writeLines(lines));
	}

	compileIdentifier(node, env) {
		const id = node.value;
		let scope = node.scope;
		if (scope) {
			if (scope.type === 'id' && Enums.hasOwnProperty(scope.value) && !scope.scope) {
				const enumObj = Enums[scope.value];
				if (!enumObj[id]) throw new Error(`Could not resolve '${scope.value}.${id}'`);
				return new CompiledNode(types[`enum-${scope.value}`], enumObj[id]);
			}
			scope = this.compileValue(node.scope);
			if (scope.type.name === 'player') return this.compileIdentifierPlayer(node, scope.value);
		}

		if (this.constants.has(id)) return this.constants.get(id);
		env = env.lookup(id);
		if (!env) throw new Error(`'${id}' has not been declared`);
		const assigned = env.get(id);
		let type = env.getType(id);
		if (type === 'var') type = types.dynamic;
		return new CompiledNode(type, `Value In Array(Global Variable(${assigned[0]}), ${assigned[1]})`);
	}

	compileIdentifierPlayer(node, scope) {
		const id = node.value;
		const playerVars = this.playerVars;
		if (!playerVars.has(id)) throw new Error(`'player.${id}' has not been declared`);
		const assigned = playerVars.get(id);
		let type = playerVars.getType(id);
		if (type === 'var') type = types.dynamic;

		return new CompiledNode(type, `Value In Array(Player Variable(${scope}, ${assigned[0]}), ${assigned[1]})`);
	}

	compileDeclare(node) {
		if (node.player) return this.compileDeclarePlayer(node);

		const name = node.name;
		if (this.identifiers.includes(name) || this.constants.includes(name)) {
			throw new Error(`'${name}' has already been declared`);
		}
		let type = node.varType;
		if (type !== 'var' && !types[type]) throw new Error(`Could not resolve type '${type}'`);
		if (type !== 'var') type = types[type];
		const assigned = this.env.declare(name, type);
		console.log(`Using ${assigned[0]}[${assigned[1]}] as ${type.name || type} ${name}`);
		return nodeVoid;
	}

	compileDeclarePlayer(node) {
		const name = node.name;
		let type = node.varType;
		if (type !== 'var' && !types[type]) throw new Error(`Could not resolve type '${type}'`);
		if (type !== 'var') type = types[type];
		const assigned = this.playerVars.declare(name, type);
		console.log(`Using player ${assigned[0]}[${assigned[1]}] as ${name}`);
		return nodeVoid;
	}

	compileAssign(node) {
		let scope;
		if (node.scope) scope = this.compileValue(node.scope);
		if (scope && scope.type.name === 'player') return this.compileAssignPlayer(node, scope.value);

		const id = node.name;
		let env = this.env;
		if (this.constants.has(id)) throw new Error(`'${id}' is a constant and cannot be reassigned`);
		env = env.lookup(id);
		if (!env) throw new Error(`'${id}' has not been declared`);
		const assigned = env.get(id);
		const type = env.getType(id);
		const value = this.compileValue(node.value);
		if (value.type.isEnum) throw new Error('Cannot assign enum to variable');
		if (type === 'var') env.setVarType(id, value.type);
		if (type !== 'var' && !type.canResolve(value.type.name)) {
			throw new Error(`Expected '${type.name}' for '${id}' but got '${value.type.name}'`);
		}

		return new CompiledNode(types.void, `Set Global Variable At Index(${assigned[0]}, ${assigned[1]}, ${value.value})`);
	}

	compileAssignPlayer(node, scope) {
		const id = node.name;
		const playerVars = this.playerVars;
		if (!playerVars.has(id)) throw new Error(`'player.${id}' has not been declared`);
		const assigned = playerVars.get(id);
		const type = playerVars.getType(id);
		const value = this.compileValue(node.value);
		if (value.type.isEnum) throw new Error('Cannot assign enum to variable');
		if (type === 'var') playerVars.setVarType(id, value.type);
		if (type !== 'var' && !type.canResolve(value.type.name)) {
			throw new Error(`Expected '${type.name}' for '${id}' but got '${value.type.name}'`);
		}

		return new CompiledNode(types.void,
			`Set Player Variable At Index(${scope}, ${assigned[0]}, ${assigned[1]}, ${value.value})`);
	}

	writeLines(lines, indentLevel = 0) {
		let output = '';
		let first = true;
		for (const line of lines) {
			if (typeof line === 'number') {
				indentLevel += line;
			} else if (typeof line === 'string') {
				if (!first) output += '\n';
				else first = false;
				for (let i = indentLevel; i > 0; i--) output += '\t';
				output += line;
			} else {
				output += '\n';
			}
		}

		return output;
	}
}

module.exports = Compiler;
