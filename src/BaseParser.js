const Lexer = require('./Lexer');

class BaseParser {
	constructor(data, keywords, operators, types) {
		const lexer = Lexer(keywords, operators);
		this.keywords = keywords;
		this.types = types;
		lexer.reset(data);
		this.lexer = lexer;

		this._peeked = null;
	}

	next() {
		if (this._peeked) {
			let tok = this._peeked;
			this._peeked = null;
			return tok;
		}
		let tok = this.lexer.next();
		while (tok && tok.type === 'ignore') tok = this.lexer.next();
		if (tok && tok.type === 'id') {
			if (this.keywords.includes(tok.value)) tok.type = 'keyword';
		}
		return tok;
	}

	peek() {
		if (this._peeked) return this._peeked;
		this._peeked = this.next();
		return this._peeked;
	}

	eof() {
		return this.peek() === undefined;
	}

	error(token, message) {
		console.log(token);
		throw this.lexer.formatError(token, message);
	}

	consume(type, ...vals) {
		const peeked = this.peek();
		if (!this.is(peeked, type, ...vals)) {
			this.error(peeked, `Expected ${vals.length === 1 ?
				`'${vals[0]}'` : `one of ${vals.map(e => `'${e}'`).join(',')}`} but got ${peeked.type} '${peeked.value}'`);
		}
		this.skip();
	}

	skip() {
		this.next();
	}

	skipSemi() {
		if (this.peek().type !== 'operator' || this.peek().value !== ';') this.error(this.peek(), `Missing ;`);
		this.skip();
	}

	is(tok, type, ...vals) {
		if (!tok || tok.type !== type) return false;
		return vals.includes(tok.value);
	}

	peekIs(type, ...vals) {
		return this.is(this.peek(), type, ...vals);
	}

	delimited(start, stop, separator, parser) {
		let a = [];
		let first = true;
		this.consume('operator', start);
		while (!this.eof()) {
			if (this.peekIs('operator', stop)) break;
			if (first) first = false;
			else this.consume('operator', separator);
			if (this.peekIs('operator', stop)) break;
			a.push(parser());
		}
		this.consume('operator', stop);
		return a;
	}

	minify(token) {
		return { type: token.type, value: token.value };
	}
}

module.exports = BaseParser;
