import { jest as bunJest, mock as bunMock } from "bun:test";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const nodeRequire = createRequire(import.meta.url);
const { applyBunJestCompat } = nodeRequire(
  join(dirname(fileURLToPath(import.meta.url)), "apply-bun-jest-compat.cjs"),
) as {
  applyBunJestCompat: (j: typeof bunJest, m: typeof bunMock) => void;
};

applyBunJestCompat(bunJest, bunMock);
