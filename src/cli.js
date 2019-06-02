#!/usr/bin/env node
const program = require('commander');
const run = require('./app');

program
	.version('0.1.0', '-v, --version')
	.option('-o, --output [path]', 'The file path of the output file')
	.option('-t, --tree', 'Write the syntax tree to a file rather than compiled code')
	.option('-m --minify', 'Minify the output')
	.parse(process.argv);

if (program.args.length === 0) {
	program.outputHelp();
} else {
	run(program);
}
