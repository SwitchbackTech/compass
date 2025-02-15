import path from "path";
import { fileURLToPath } from "url";
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import tsparser from "@typescript-eslint/parser";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import pluginJest from "eslint-plugin-jest";
import jestDom from "eslint-plugin-jest-dom";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import testingLibrary from "eslint-plugin-testing-library";
import importPlugin from "eslint-plugin-import";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  importPlugin.flatConfigs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ...importPlugin.flatConfigs.typescript,
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      // parser: tsparser,
      // parserOptions: {
      //   project: [
      //     "./tsconfig.json",
      //     "./packages/backend/tsconfig.json",
      //     "./packages/web/tsconfig.json",
      //   ],
      // },
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
          // alwaysTryTypes: true,
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
      "import/no-dynamic-require": "warn",
    },
  },
  {
    files: ["packages/web/src/**/*"],
    rules: {
      "import/no-nodejs-modules": "warn",
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
  // this prettier plugin adjusts other parts of this config,
  // so keep it as the last item
  eslintPluginPrettierRecommended,
];
