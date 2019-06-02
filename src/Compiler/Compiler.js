const VariableHandler = require('./VariableHandler');
const Enviroment = require('./Scope');
const CompiledNode = require('./CompiledNode');

// Used when no code is needed in the final compiled file
// const nodeVoid = new CompiledNode(types.void);
// const nodeFalse = new CompiledNode(types.boolean, 'false');

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
	}

	// Compile an action (call that does not refer to a value)
	_compileAction(node) {
	}

	// Compile a value (can be stored in variables or passed as arguments)
	_compileValue(node) {
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
