/// <reference types="bun-types/test-globals" />
import { afterEach, expect, jest } from "bun:test";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { createRequire } from "module";

// Set up global jest object for @testing-library/react act compatibility
globalThis.jest = jest;

const requireMatchers = createRequire(import.meta.path);
const jestDomMatchers = requireMatchers(
  "@testing-library/jest-dom/dist/matchers.js",
) as Record<string, unknown>;
expect.extend(jestDomMatchers);

//cleans up `render` after each test
afterEach(() => {
  cleanup();
});
