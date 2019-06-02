const { oneLine } = require('common-tags');

function argFormat(args) {
	return args.join(', ');
}

const SCOPES = {
	GLOBAL: ['void'],
	PLAYER: ['player'],
	VECTOR: ['vector'],
	ENVIROMENTS: ['global', 'player'],
};

const actions = {
	applyImpulse: {
		scopes: SCOPES.ENVIROMENTS,
		args: ['player', 'vector', 'number', 'boolean', 'boolean'],
		map: (env, args) => oneLine`Apply Impulse(${argFormat(args.slice(0, 3))},
			${args[3] === 'true' ? 'To Player' : 'To World'},
			${args[4] === 'true' ? 'Incorporate Contrary Motion' : 'Cancel Contrary Motion'})`,
	},
};

module.exports.argFormat = argFormat;
module.exports.SCOPES = SCOPES;
module.exports.actions = actions;
