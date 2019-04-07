import { terser } from "rollup-plugin-terser";
export default [
  {
    input: "src/index.js",
    output: [
      {
        file: "dist/index.js",
        name: "funcyjs",
        format: "umd",
        sourcemap: true
      },
      {
        file: "dist/index.esm.js",
        format: "esm",
        sourcemap: true
      }
    ]
  },
  {
    input: "src/index.js",
    plugins: [terser({ sourcemap: true })],
    output: [
      {
        file: "dist/index.min.js",
        name: "funcyjs",
        format: "umd",
        sourcemap: true
      },
      {
        file: "dist/index.esm.min.js",
        format: "esm",
        sourcemap: true
      }
    ]
  }
];
