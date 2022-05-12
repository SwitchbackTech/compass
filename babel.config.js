module.exports = {
  presets: [
    "@babel/preset-react",
    ["@babel/preset-env", { targets: { node: "current" } }],
    "@babel/preset-typescript",
  ],
  plugins: [
    [
      "babel-plugin-styled-components",
      {
        meaninglessFileNames: ["index", "styled"],
        pure: true,
      },
    ],
  ],
};
