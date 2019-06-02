const fs = require('fs');
const path = require('path');
const Parser = require('./Parser');
const Compiler = require('./Compiler/Compiler');

module.exports = function run(program) {
	let inFile, inFilePath, astFilePath, outFilePath;

	inFilePath = program.args[0];
	if (!fs.existsSync(inFilePath)) return console.log(`Cannot find '${inFilePath}'`);
	inFilePath = path.resolve(inFilePath);
	inFile = fs.readFileSync(inFilePath).toString();

	let inFileNoExt = inFilePath.endsWith('.ows') ? inFilePath.substr(0, inFilePath.length - 4) : inFilePath;
	if (program.output) {
		outFilePath = path.resolve(program.output);
	} else {
		outFilePath = `${inFileNoExt}.owc`;
	}

	astFilePath = `${inFileNoExt}.json`;

	const parser = new Parser(inFile);
	const ast = parser.parseTopLevel();
	fs.writeFileSync(astFilePath, JSON.stringify(ast, null, 4));
	if (program.tree) return;
	const compiler = new Compiler(ast);
	let output = compiler.dispatch();
	if (program.minify) output = output.replace(/\s/g, '').toLowerCase();
	console.log(output);
	fs.writeFileSync(outFilePath, output);
};
