const path = require("path");

module.exports = {
  parser: "@typescript-eslint/parser",
  ignorePatterns: [".eslintrc.js"],
  plugins: [
    "@typescript-eslint",
    "import",
    "jest",
    "jest-dom",
    "prettier",
    "react",
    "react-hooks",
    "testing-library",
  ],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],

      // extend TypeScript plugins here,
      // instead of extending them outside the `overrides`.
      // If you don't want to extend any rules, you don't need an `extends` attribute.
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],

      parserOptions: {
        project: [
          "./tsconfig.json",
          "./packages/backend/tsconfig.json",
          "./packages/web/tsconfig.json",
        ],
      },
    },
    {
      // Only enable eslint-plugin-testing-library rules for tests
      files: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
      extends: ["plugin:testing-library/react"],
      rules: {
        "testing-library/await-async-query": "error",
        "testing-library/await-async-utils": "error",
        "testing-library/no-await-sync-query": "error",
        "testing-library/no-debugging-utils": "error",
        "testing-library/no-dom-import": "off",
        "testing-library/no-render-in-setup": "warn",
        "testing-library/prefer-query-by-disappearance": "error",
        "testing-library/prefer-screen-queries": "error",
        "testing-library/prefer-user-event": "error",
      },
    },
  ],
  env: {
    "jest/globals": true,
  },
  settings: {
    "import/resolver": {
      "eslint-import-resolver-lerna": {
        packages: path.resolve(__dirname, "packages"),
      },
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:jest-dom/recommended",
    // this prettier plugin adjusts other parts of this config,
    // so keep it as the last extends item
    "plugin:prettier/recommended",
  ],
  parserOptions: {
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
    "no-param-reassign": "off",
    "no-underscore-dangle": "off",
    "no-unreachable": "error",
    "react/jsx-props-no-spreading": "off",
    "react/no-array-index-key": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn", // Checks effect dependencies
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
