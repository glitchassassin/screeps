"use strict";

import clear from 'rollup-plugin-clear';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import screeps from 'rollup-plugin-screeps';
import typescript from 'rollup-plugin-typescript2';

let cfg;
const dest = process.env.DEST;
const config = process.env.SCREEPS_CONFIG;
if (config) {
  console.log("Loading config from environment variable");
  cfg = JSON.parse(config);
} else if (!dest) {
  console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = require("./screeps.json")[dest]) == null) {
  throw new Error("Invalid upload destination");
}

export default {
  input: "src/main.ts",
  output: {
    file: "dist/main.js",
    format: "cjs",
    sourcemap: true
  },

  plugins: [
    clear({ targets: ["dist"] }),
    resolve(),
    commonjs({
      namedExports: {
        'node_modules/class-transformer/index.js': [
          'Transform',
          'Type',
          'Exclude',
        ],
        'node_modules/typescript-memoize/dist/memoize-decorator.js': [
          'Memoize',
        ]
      }
    }),
    typescript({tsconfig: "./tsconfig.json"}),
    screeps({config: cfg, dryRun: cfg == null}),
    replace({
      preventAssignment: true,
      __buildDate__: () => JSON.stringify(Date.now()),
    })
  ]
}
