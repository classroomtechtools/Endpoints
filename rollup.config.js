import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import multi from '@rollup/plugin-multi-entry';

const production = !process.env.ROLLUP_WATCH;
const plugins = [multi(), resolve(), commonjs()];

export default [{
	input: ['src/modules/*.js','src/modules/builtins/*.js'],
	treeshake: true,
	output: {
		format: 'cjs',
		file: './build/Bundle.js',
		banner: '/* Bundle as defined from all files in src/modules/*.js */\nconst Import = Object.create(null);\n',
		intro: '(function (exports, window) {\n// provide global (danger zone)\nexports.__window = window;',
		outro: '})(Import, this);\ntry{exports.Import = Import;}catch(e){}'
	},
	plugins
}, {
	input: ['src/tests/*.js'],
	treeshake: true,
	output: {
		format: 'iife',
		file: './build/TestBundle.js',
		banner: '/* Bundle as defined from all files in tests/serverside/*.js */\nfunction Test_(remote=false) {\n',
		footer: 'try { return Log.get() } catch (e) {} \n}'
	},
	plugins
}];
