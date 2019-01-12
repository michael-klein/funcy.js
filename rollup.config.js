import { terser } from "rollup-plugin-terser";
export default [
  {
    input: "src/export_core.mjs",
    output: [
      {
        file: "dist/core.js",
        name: "funcyjs",
        format: "umd",
        sourcemap: true
      },
      {
        file: "dist/core.mjs",
        format: "esm",
        sourcemap: true
      }
    ]
  },
  {
    input: "src/export_all.mjs",
    output: [
      {
        file: "dist/full.js",
        name: "funcyjs",
        format: "umd",
        sourcemap: true
      },
      {
        file: "dist/full.mjs",
        format: "esm",
        sourcemap: true
      }
    ]
  },
  {
    input: "src/export_core.mjs",
    plugins: [terser({ sourcemap: true })],
    output: [
      {
        file: "dist/core.min.js",
        name: "funcyjs",
        format: "umd",
        sourcemap: true
      },
      {
        file: "dist/core.min.mjs",
        format: "esm",
        sourcemap: true
      }
    ]
  },
  {
    input: "src/export_all.mjs",
    plugins: [terser({ sourcemap: true })],
    output: [
      {
        file: "dist/full.min.js",
        name: "funcyjs",
        format: "umd",
        sourcemap: true
      },
      {
        file: "dist/full.min.mjs",
        format: "esm",
        sourcemap: true
      }
    ]
  }
];
