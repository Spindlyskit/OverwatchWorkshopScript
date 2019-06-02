const { argFormat, SCOPES } = require('./Actions');
const Types = require('./Types');

const values = {
	Vector: {
		returns: Types.vector,
		scopes: SCOPES.GLOBAL,
		args: ['number', 'number', 'number'],
		map: (env, args) => `Vector(${argFormat(args)})`,
	},
};

const playerValues = {
	getAltitude: {
		returns: Types.number,
		scopes: SCOPES.ENVIROMENTS,
		args: ['player'],
		map: (env, args) => `Altitude Of(${argFormat(args)})`,
	},
	isButtonHeld: {
		returns: Types.boolean,
		scopes: SCOPES.ENVIROMENTS,
		args: ['player', 'enum-Button'],
		map: (env, args) => `Is Button Held(${argFormat(args)})`,
	},
	isOnGround: {
		returns: Types.boolean,
		scopes: SCOPES.ENVIROMENTS,
		args: ['player'],
		map: (env, args) => `Is On Ground(${argFormat(args)})`,
	},
};

const vectorValues = {
	x: {
		returns: Types.number,
		scopes: SCOPES.VECTOR,
		args: ['vector'],
		map: (env, args) => `X Component Of(${args[0]})`,
	},
	y: {
		returns: Types.number,
		scopes: SCOPES.VECTOR,
		args: ['vector'],
		map: (env, args) => `Y Component Of(${args[0]})`,
	},
	z: {
		returns: Types.number,
		scopes: SCOPES.VECTOR,
		args: ['vector'],
		map: (env, args) => `Z Component Of(${args[0]})`,
	},
};

module.exports.values = Object.assign(values, playerValues, vectorValues);
