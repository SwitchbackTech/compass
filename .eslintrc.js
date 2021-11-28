const path = require("path");

module.export = {
  settings: {
    "import/resolver": {
      "eslint-import-resolver-lerna": {
        packages: path.resolve(__dirname, "src/packages"),
      },
    },
  },
};
