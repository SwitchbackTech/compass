import pluginJest from "eslint-plugin-jest";
import jestDom from "eslint-plugin-jest-dom";
import prettierEslint from "eslint-plugin-prettier";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import testingLibrary from "eslint-plugin-testing-library";
import globals from "globals";
import path from "path";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "url";
import pluginJs from "@eslint/js";
import sortImports from "@trivago/prettier-plugin-sort-imports";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        "eslint-import-resolver-lerna": {
          packages: path.resolve(__dirname, "packages"),
        },
        typescript: {
          project: [
            "./tsconfig.json",
            "./packages/backend/tsconfig.json",
            "./packages/web/tsconfig.json",
          ],
        },
      },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // Rules and plugins for tests only
    files: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
    plugins: {
      jest: pluginJest,
      ...jestDom.configs["flat/dom"],
      ...testingLibrary.configs["flat/recommended"],
      ...testingLibrary.configs["flat/react"],
    },
    languageOptions: {
      globals: pluginJest.environments.globals.globals,
    },
    rules: {
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/no-identical-title": "error",
      "jest/prefer-to-have-length": "warn",
      "jest/valid-expect": "error",
    },
  },
  // these plugins adjust other parts of this config,
  // so keep them down here
  prettierEslint,
  sortImports,
];
