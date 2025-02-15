import globals from "globals";
import { pluginJs as jsPlugin } from "@eslint/js";
import { tseslint as tsEslintPlugin } from "typescript-eslint";
import { pluginReact as reactPlugin } from "eslint-plugin-react";
import { reactHooks as reactHooksPlugin } from "eslint-plugin-react-hooks";

/** @type {import('eslint').Linter.Config[]} */
export default [
  jsPlugin.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  ...tsEslintPlugin.configs.recommended,
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: { "react-hooks": reactHooksPlugin },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
