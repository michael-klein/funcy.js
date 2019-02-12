import { terser } from "rollup-plugin-terser";
export default [
  {
    input: "src/export_core.js",
    output: [
      {
        file: "dist/core.js",
        name: "funcyjs",
        format: "umd",
        sourcemap: true
      },
      {
        file: "dist/core.js",
        format: "esm",
        sourcemap: true
      }
    ]
  },
  {
    input: "src/export_all.js",
    output: [
      {
        file: "dist/full.js",
        name: "funcyjs",
        format: "umd",
        sourcemap: true
      },
      {
        file: "dist/full.js",
        format: "esm",
        sourcemap: true
      }
    ]
  },
  {
    input: "src/export_core.js",
    plugins: [terser({ sourcemap: true })],
    output: [
      {
        file: "dist/core.min.js",
        name: "funcyjs",
        format: "umd",
        sourcemap: true
      },
      {
        file: "dist/core.min.js",
        format: "esm",
        sourcemap: true
      }
    ]
  },
  {
    input: "src/export_all.js",
    plugins: [terser({ sourcemap: true })],
    output: [
      {
        file: "dist/full.min.js",
        name: "funcyjs",
        format: "umd",
        sourcemap: true
      },
      {
        file: "dist/full.min.js",
        format: "esm",
        sourcemap: true
      }
    ]
  }
];
