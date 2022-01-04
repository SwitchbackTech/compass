console.log("\n\n\nin babel config root");
module.exports = {
  presets: [
    "@babel/preset-react",
    ["@babel/preset-env", { targets: { node: "current" } }],
    "@babel/preset-typescript",
  ],
};
