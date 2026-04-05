"use strict";

const { createRequire } = require("node:module");

const compatFilePath = __filename;

function getCallerRequire() {
  const stack = new Error().stack?.split("\n") ?? [];

  for (const frame of stack.slice(2)) {
    const match =
      frame.match(/\((.*):\d+:\d+\)$/) ?? frame.match(/at (.*):\d+:\d+$/);
    const file = match?.[1];

    if (
      file &&
      file !== compatFilePath &&
      !file.includes("core.jest-compat") &&
      !file.includes("apply-bun-jest-compat")
    ) {
      return createRequire(file);
    }
  }

  return require;
}

function resolveModule(moduleName) {
  const callerRequire = getCallerRequire();

  try {
    return {
      callerRequire,
      resolvedModule: callerRequire.resolve(moduleName),
    };
  } catch {
    return {
      callerRequire,
      resolvedModule: moduleName,
    };
  }
}

const actualModules = new Map();

function autoMockValue(bunJest, value, seen) {
  if (value === null || value === undefined) {
    return value;
  }

  const primitiveType = typeof value;

  if (
    primitiveType === "string" ||
    primitiveType === "number" ||
    primitiveType === "boolean" ||
    primitiveType === "bigint" ||
    primitiveType === "symbol"
  ) {
    return value;
  }

  if (primitiveType === "function") {
    return bunJest.fn(value);
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return seen.get(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => autoMockValue(bunJest, item, seen));
    }

    const out = {};
    seen.set(value, out);

    for (const key in value) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);

      if (descriptor?.get || descriptor?.set) {
        continue;
      }

      try {
        out[key] = autoMockValue(bunJest, value[key], seen);
      } catch {
        // ignore TDZ / non-readable props
      }
    }

    return out;
  }

  return value;
}

function applyBunJestCompat(bunJest, bunMock) {
  const jestCompat = bunJest;

  jestCompat.requireActual = (moduleName) => {
    const { callerRequire, resolvedModule } = resolveModule(moduleName);

    if (!actualModules.has(resolvedModule)) {
      actualModules.set(resolvedModule, callerRequire(moduleName));
    }

    return actualModules.get(resolvedModule);
  };

  jestCompat.createMockFromModule = (moduleName) => {
    const actual = jestCompat.requireActual(moduleName);

    return autoMockValue(bunJest, actual, new WeakMap());
  };

  jestCompat.requireMock = (moduleName) => {
    const { callerRequire } = resolveModule(moduleName);

    return callerRequire(moduleName);
  };

  jestCompat.mocked = (item) => item;

  jestCompat.mock = (moduleName, factory) => {
    const actualModule = jestCompat.requireActual(moduleName);
    const { resolvedModule } = resolveModule(moduleName);

    bunMock.module(resolvedModule, () => {
      return factory ? factory() : actualModule;
    });

    return bunJest;
  };
}

module.exports = { applyBunJestCompat };
