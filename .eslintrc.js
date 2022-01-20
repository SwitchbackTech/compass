const path = require("path");

module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: [
    "@typescript-eslint",
    "prettier",
    "import",
    "react",
    "react-hooks",
    "jest",
  ],
  env: {
    "jest/globals": true,
  },
  settings: {
    "import/resolver": {
      "eslint-import-resolver-lerna": {
        packages: path.resolve(__dirname, "src/packages"),
      },
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    // this prettier plugin adjusts other parts of this config,
    // so keep it as the last extends item
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    // TODO enable once using a root tsconfig that packages extend
    // project: path.resolve(__dirname, "tsconfig.json"),
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/naming-convention": "off",
    "import/prefer-default-export": "off",
    "import/no-extraneous-dependencies": "off",
    "jest/no-disabled-tests": "warn",
    "jest/no-focused-tests": "error",
    "jest/no-identical-title": "error",
    "jest/prefer-to-have-length": "warn",
    "jest/valid-expect": "error",
    "jsx-a11y/no-static-element-interactions": "off",
    "jsx-a11y/click-events-have-key-events": "off",
    "jsx-a11y/no-autofocus": "off",
    "no-underscore-dangle": "off",
    "no-param-reassign": "off",
    "react/jsx-props-no-spreading": "off",
    "react/no-array-index-key": "off",
    "prettier/prettier": ["error", { singleQuote: true }],
    quotes: [2, "single"],
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
  },
};
