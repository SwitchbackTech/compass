import eslintConfigPrettier from "eslint-config-prettier";
import pluginJest from "eslint-plugin-jest";
import jestDom from "eslint-plugin-jest-dom";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettierEslint from "eslint-plugin-prettier";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import testingLibrary from "eslint-plugin-testing-library";
import globals from "globals";
import path from "path";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "url";
import pluginJs from "@eslint/js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { project: false, projectService: false },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  // e2e lives outside root tsconfig.json; use an explicit project so type-aware
  // rules work in ESLint (including editors using the project service).
  {
    files: ["e2e/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./e2e/tsconfig.json",
        tsconfigRootDir: __dirname,
      },
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
            "./e2e/tsconfig.json",
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
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    // Accessibility linting for JSX/TSX files
    files: ["**/*.{jsx,tsx}"],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    // Rules and plugins for tests only
    files: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
    plugins: {
      ...pluginJest.configs["flat/recommended"].plugins,
      ...jestDom.configs["flat/recommended"].plugins,
      ...testingLibrary.configs["flat/dom"].plugins,
      ...testingLibrary.configs["flat/react"].plugins,
    },
    languageOptions: {
      ...pluginJest.configs["flat/recommended"].languageOptions,
      globals: pluginJest.environments.globals.globals,
    },
    rules: {
      ...pluginJest.configs["flat/recommended"].rules,
      ...jestDom.configs["flat/recommended"].rules,
      ...testingLibrary.configs["flat/dom"].rules,
      ...testingLibrary.configs["flat/react"].rules,
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/no-identical-title": "error",
      "jest/prefer-to-have-length": "warn",
      "jest/valid-expect": "error",
      "@typescript-eslint/unbound-method": "off",
      "jest/unbound-method": "error",
    },
  },
  {
    files: ["e2e/**/*.ts"],
    rules: {
      // Playwright e2e is not React Testing Library; page.getByRole is correct.
      "testing-library/prefer-screen-queries": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
  // Warn on console.log in packages/web to avoid leaking secure info
  {
    files: ["packages/web/**/*.{ts,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // these plugins adjust other parts of this config,
  // so keep them down here
  {
    plugins: {
      prettier: prettierEslint,
    },
    rules: {
      ...prettierEslint.configs.recommended.rules,
    },
  },
  eslintConfigPrettier,
];
