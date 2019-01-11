export default [
  {
    input: "src/index.mjs",
    output: [
      {
        file: "dist/core.js",
        name: "funcyjs",
        format: "umd"
      },
      {
        file: "dist/core.mjs",
        format: "esm"
      }
    ]
  },
  {
    input: "src/export_all.mjs",
    output: [
      {
        file: "dist/full.js",
        name: "funcyjs",
        format: "umd"
      },
      {
        file: "dist/full.mjs",
        format: "esm"
      }
    ]
  }
];
