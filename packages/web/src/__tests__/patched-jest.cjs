"use strict";

const { createRequire } = require("node:module");
const path = require("node:path");

const nodeRequire = createRequire(__filename);
const applyCompatPath = path.join(
  __dirname,
  "../../../scripts/src/testing/apply-bun-jest-compat.cjs",
);

function loadJest() {
  try {
    const bunTest = nodeRequire("bun:test");
    const { applyBunJestCompat } = nodeRequire(applyCompatPath);
    applyBunJestCompat(bunTest.jest, bunTest.mock);
    globalThis.jest = bunTest.jest;
    return bunTest.jest;
  } catch {
    if (globalThis.jest) {
      return globalThis.jest;
    }

    return nodeRequire("@jest/globals").jest;
  }
}

const jestBinding = loadJest();

exports.jest = jestBinding;
