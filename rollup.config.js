import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import multi from '@rollup/plugin-multi-entry';

const production = !process.env.ROLLUP_WATCH;

export default [{
	input: ['src/modules/*.js','src/modules/builtins/*.js'],
	treeshake: true,
	output: {
		format: 'cjs',
		file: './project/Bundle.js',
		banner: '/* Bundle as defined from all files in src/modules/*.js */\nconst Import = Object.create(null);\n',
		intro: '(function (exports, window) {',
		outro: '})(Import, this);\ntry{exports.Import = Import;}catch(e){}'
	},plugins: [
		multi(),
		resolve(),
		commonjs()
	]
}];
