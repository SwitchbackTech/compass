const path = require("path");

module.exports = {
  settings: {
    "import/resolver": {
      "eslint-import-resolver-lerna": {
        packages: path.resolve(__dirname, "src/packages"),
      },
    },
  },
};
