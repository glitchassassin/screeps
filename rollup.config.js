'use strict';

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import fs from 'fs';
import clear from 'rollup-plugin-clear';
import screeps from 'rollup-plugin-screeps';
import tsConfigPaths from 'rollup-plugin-tsconfig-paths';
import typescript from 'rollup-plugin-typescript2';

let cfg;
const dest = process.env.DEST;
const config = process.env.SCREEPS_CONFIG;
if (config) {
  console.log('Loading config from environment variable');
  cfg = JSON.parse(config);
} else if (!dest) {
  console.log('No destination specified - code will be compiled but not uploaded');
} else if ((cfg = require('./screeps.json')[dest]) == null) {
  throw new Error('Invalid upload destination');
}

function rewriteCombatImport() {
  if (fs.existsSync('../screeps-combat/src/index.ts')) {
    return "import Combat from 'screeps-combat';";
  } else {
    return "import Combat from 'Strategy/CombatStub';";
  }
}

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'cjs',
    sourcemap: true
  },

  plugins: [
    clear({ targets: ['dist'] }),
    replace({
      preventAssignment: true,
      values: {
        __buildDate__: () => JSON.stringify(Date.now()),
        "import Combat from 'Strategy/CombatStub';": rewriteCombatImport
      }
    }),
    tsConfigPaths(),
    resolve(),
    commonjs({
      namedExports: {
        'node_modules/class-transformer/index.js': ['Transform', 'Type', 'Exclude']
      }
    }),
    typescript({ tsconfig: './tsconfig.json' }),
    screeps({ config: cfg, dryRun: cfg == null })
  ]
};
