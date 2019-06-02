const BaseParser = require('./BaseParser');
const { keywords, operators } = require('./Elements/Constants');
const types = require('./Elements/Types');

const TRUE = { type: 'boolean', value: 'true' };
const FALSE = { type: 'boolean', value: 'false' };
const PRECEDENCE = {
	'||': 2,
	'&&': 3,
	'<': 4, '>': 4, '<=': 4, '>=': 4, '==': 4, '!=': 4,
	'+': 5, '-': 5,
	'*': 6, '/': 6, '%': 6,
};

class Parser extends BaseParser {
	constructor(data) {
		super(data, keywords, operators, types);
	}

	// Simple function that parses the top level of the program
	parseTopLevel() {
		let block = [];
		while (!this.eof()) {
			block.push(this.parseExpression());
			if (!this.eof()) this.skipSemi(';');
		}
		return { type: 'block', block: block };
	}

	parseExpression() {
		return this.maybeCall(() => this.maybeBinary(this.parseAtom(), 0));
	}

	parsePlayer() {
		this.skip();
		if (!this.peekIs('operator', '.')) return { type: 'player', value: 'player' };
		this.consume('operator', '.');
		const expr = this.parseExpression();
		expr.scope = 'player';
		return expr;
	}

	parseAtom() {
		return this.maybeCall(() => {
			if (this.peekIs('operator', '(')) {
				this.next();
				let exp = this.parseExpression();
				this.consume('operator', ')');
				return exp;
			}
			if (this.peekIs('operator', '{')) return this.parseBlock();
			if (this.peekIs('keyword', 'if')) return this.parseIf();
			if (this.peekIs('keyword', 'const')) return this.parseConst();
			if (this.peekIs('keyword', 'rule')) return this.parseRule();
			if (this.peekIs('keyword', 'true') || this.peekIs('keyword', 'false')) return this.parseBoolean();
			if (this.peekIs('operator', '!')) return this.parseNegation();
			if (this.peekIs('keyword', 'usevar')) {
				this.next();
				return this.parseUsevar();
			}
			if (this.peek().type === 'id' || this.peekIs('keyword', 'player') || this.peekIs('keyword', 'var')) {
				const tok = this.next();
				if (this.peek().type === 'id' || this.peekIs('keyword', 'player')) return this.parseDeclare(tok);
				return this.parseId(tok);
			}
			let tok = this.next();
			if (tok.type === 'number' || tok.type === 'string') return tok;
			this.error(tok, `Unexpected ${tok.type} '${tok.value}'`);
		});
	}

	parseIf() {
		this.consume('keyword', 'if');
		const cond = this.parseExpression();
		const then = this.parseExpression();
		const ret = { type: 'if', cond: cond, then: then };
		if (this.peekIs('keyword', 'else')) {
			this.next();
			ret.else = this.parseExpression();
		}
		return ret;
	}

	parseBlock() {
		let block = this.delimited('{', '}', ';', () => this.parseExpression());
		return { type: 'block', block: block };
	}

	parseEnum() {
		const name = this.next().value;
		this.consume('operator', '.');
		const id = this.next();
		if (id.type !== 'id' && id.type !== 'keyword') this.error(`Expected an identifier but got ${id.type} '${id.value}'`);
		return {
			type: 'enum',
			enum: name,
			value: id.value,
		};
	}

	parseRule() {
		let conditions, actions;
		this.skip();
		const name = this.next();
		if (name.type !== 'string') this.error(name, `Expected string but got ${name.type} '${name.value}'`);
		this.consume('operator', ':');
		this.consume('id', 'Event');
		this.consume('operator', '.');
		const eventType = this.next();
		if (eventType.type !== 'id' && eventType.type !== 'keyword') this.error(`Expected an identifier but got ${eventType.type} '${eventType.value}'`);
		this.delimited('(', ')', ',', () => this.next());
		if (this.peekIs('keyword', 'if')) {
			this.skip();
			conditions = this.delimited('(', ')', ';', () => this.parseExpression());
			conditions = conditions.map(node => {
				if (node && node.type !== 'binary') {
					return {
						type: 'binary',
						operator: '==',
						left: node,
						right: TRUE,
					};
				}
				return node;
			});
		}
		actions = this.delimited('{', '}', ';', () => this.parseExpression());

		return {
			type: 'rule',
			name: name.value,
			target: eventType.value,
			conditions: conditions,
			actions: actions,
		};
	}

	parseCall(call) {
		return {
			type: 'call',
			call: call,
			args: this.delimited('(', ')', ',', () => this.parseExpression()),
		};
	}

	parseUsevar() {
		const type = this.next();
		if (!this.is(type, 'keyword', 'global', 'player')) {
			throw this.error(type, `Expected 'global' or 'player' but got ${type.type} '${type.value}'`);
		}

		const variable = this.next();
		if (variable.type !== 'id' || !/[A-Z]/.test(variable.value) || variable.value.length !== 1) {
			throw this.error(variable,
				`Expected one of ABCDEFGHIJKLMNOPQRSTUVWXYZ but got ${variable.type} '${variable.value}'`);
		}

		return {
			type: 'usevar',
			scope: type.value,
			var: variable.value,
		};
	}

	parseConst() {
		this.consume('keyword', 'const');
		const name = this.next();
		if (!name || name.type !== 'id') this.error(name, `Expected an identifier but got ${name.type} '${name}'`);
		this.consume('operator', '=');
		const expr = this.maybeBinary(this.parseAtom(), 1);
		return {
			type: 'const',
			name: name.value,
			value: expr,
		};
	}

	parseDeclare(tok) {
		let player = false;
		const type = tok.value;

		if (this.peekIs('keyword', 'player')) {
			player = true;
			this.skip();
			this.consume('operator', '.');
		}

		const name = this.next();
		if (!name || name.type !== 'id') this.error(name, `Expected an identifier but got ${name.type} '${name}'`);
		const ret = {
			type: 'declare',
			varType: type,
			name: name.value,
			player,
		};

		if (this.peekIs('operator', '=')) {
			this.skip();
			ret.value = this.maybeBinary(this.parseAtom(), 1);
		}

		return ret;
	}

	parseAssign(name) {
		this.skip();
		if (!name || name.type !== 'id') this.error(name, `Expected an identifier but got ${name.type} '${name}'`);
		const expr = this.maybeBinary(this.parseAtom(), 1);
		return {
			type: 'assign',
			name: name.value,
			value: expr,
		};
	}

	parseBoolean() {
		const tok = this.next();
		if (!this.is(tok, 'keyword', 'true', 'false')) this.error(tok, `Expected 'true' or 'false' but got ${tok.type} '${tok.value}'`);
		return tok.value === 'true' ? TRUE : FALSE;
	}

	parseNegation() {
		this.skip();
		return {
			type: 'not',
			right: this.parseExpression(),
		};
	}

	parseId(tok) {
		if (tok.type === 'keyword' && tok.value === 'player') tok = { type: 'player', value: 'player' };
		if (this.peekIs('operator', '=')) return this.parseAssign(tok);
		if (this.peekIs('operator', '.')) {
			this.skip();
			const expr = this.maybeCall(() => this.parseAtom());
			let e = expr;
			while (e.scope) e = e.scope;
			e.scope = tok;
			return expr;
		}
		return tok;
	}

	maybeBinary(left, myPrec) {
		let tok = this.peek();
		if (tok && tok.type === 'operator' && PRECEDENCE.hasOwnProperty(tok.value)) {
			let hisPrec = PRECEDENCE[tok.value];
			if (hisPrec > myPrec) {
				this.next();
				let right = this.maybeBinary(this.parseAtom(), hisPrec);
				let binary = {
					type: 'binary',
					operator: tok.value,
					left: left,
					right: right,
				};
				return this.maybeBinary(binary, myPrec);
			}
		}
		return left;
	}

	maybeCall(expr) {
		expr = expr();
		if (this.peekIs('operator', '(')) {
			expr = this.parseCall(expr);
			if (this.peekIs('operator', '.')) {
				this.skip();
				const right = this.parseExpression();
				let e = right;
				while (e.scope) e = e.scope;
				e.scope = expr;
				return e;
			}
			return expr;
		}
		return expr;
	}
}

module.exports = Parser;
