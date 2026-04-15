import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
  spyOn,
  test,
} from "bun:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.path);
const { applyBunJestCompat } = require(
  "../../../scripts/src/testing/apply-bun-jest-compat.cjs",
) as {
  applyBunJestCompat: (
    bunJest: typeof jest,
    bunMock: typeof mock,
  ) => void;
};

applyBunJestCompat(jest, mock);

export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
  spyOn,
  test,
};
