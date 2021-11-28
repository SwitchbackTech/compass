const path = require("path");

module.exports = {
  parser: "@typescript-eslint/parser",
  ignorePatterns: [".eslintrc.js"],
  plugins: ["@typescript-eslint", "import", "jest"],
  env: {
    "jest/globals": true,
  },
  rules: {
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/naming-convention": "off",
    "no-underscore-dangle": "off",
    "import/prefer-default-export": "off",
    "import/no-extraneous-dependencies": "off",
    "import/order": [
      "error",
      {
        groups: [
          ["builtin", "external"],
          "internal",
          ["sibling", "parent", "index"],
        ],
        pathGroups: [
          {
            pattern: "@reduxjs/**",
            group: "external",
          },
          {
            pattern: "@redux-saga/**",
            group: "external",
          },
        ],
        pathGroupsExcludedImportTypes: ["external"],
        "newlines-between": "always",
        warnOnUnassignedImports: true,
      },
    ],
    "no-param-reassign": "off",
    "jest/no-disabled-tests": "warn",
    "jest/no-focused-tests": "error",
    "jest/no-identical-title": "error",
    "jest/prefer-to-have-length": "warn",
    "jest/valid-expect": "error",
  },
  settings: {
    "import/internal-regex": "^@.*",
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    // "prettier",
    // this prettier plugin adjusts other parts of this config
    // keep it as the last extends item
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    project: path.resolve(__dirname, "tsconfig.json"),
    sourceType: "module",
  },
};
