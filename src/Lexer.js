const moo = require('moo');

function escapeRegex(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Lexer(Keywords, Operators) {
	const lexer = moo.compile({
		id: /[a-zA-Z_][a-zA-Z0-9_]*/,
		number: /\d+(?:\.\d+)?/,
		string: { match: /"(?:(?:\\"|[^\r\n])*)"|'(?:(?:\\'|[^\r\n])*)'/, value: s => s.slice(1, -1) },
		ignore: { match: /[\r\n]+|[ \t]+|\/\/.*?$/, lineBreaks: true },
		operator: new RegExp(Operators.map(escapeRegex).join('|')),
	});

	return lexer;
}

module.exports = Lexer;
