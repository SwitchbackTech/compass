"use strict";

const { createRequire } = require("node:module");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const FakeTimers = require("@sinonjs/fake-timers");

const compatFilePath = __filename;

function getCallerRequire() {
  const stack = new Error().stack?.split("\n") ?? [];

  for (const frame of stack.slice(2)) {
    const match =
      frame.match(/\((.*):\d+:\d+\)$/) ?? frame.match(/at (.*):\d+:\d+$/);
    const file = match?.[1];

    if (
      file &&
      (path.isAbsolute(file) || file.startsWith("file://")) &&
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
let fakeClock = null;

function syncWindowTimerGlobals() {
  if (!globalThis.window) {
    return;
  }

  for (const key of [
    "Date",
    "clearImmediate",
    "clearInterval",
    "clearTimeout",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "setImmediate",
    "setInterval",
    "setTimeout",
  ]) {
    if (key in globalThis) {
      globalThis.window[key] = globalThis[key];
    }
  }
}

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
    if (seen.has(value)) {
      return seen.get(value);
    }

    const mockedFunction = bunJest.fn(value);
    seen.set(value, mockedFunction);

    for (const key of Reflect.ownKeys(value)) {
      if (key === "length" || key === "name" || key === "prototype") {
        continue;
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);

      if (descriptor?.get || descriptor?.set) {
        continue;
      }

      try {
        mockedFunction[key] = autoMockValue(bunJest, value[key], seen);
      } catch {
        // ignore TDZ / non-readable props
      }
    }

    return mockedFunction;
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return seen.get(value);
    }

    if (Array.isArray(value)) {
      const out = [];
      seen.set(value, out);

      for (let i = 0; i < value.length; i++) {
        if (i in value) {
          try {
            out[i] = autoMockValue(bunJest, value[i], seen);
          } catch {
            // ignore TDZ / non-readable props
          }
        }
      }

      return out;
    }

    const out = {};
    seen.set(value, out);

    for (const key of Reflect.ownKeys(value)) {
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

function mergeFactoryResultWithActual(jestCompat, moduleName, factoryResult) {
  let actualModule = {};

  try {
    const actual = jestCompat.requireActual(moduleName);

    if (actual && typeof actual === "object") {
      actualModule = actual;
    }
  } catch {
    // Some virtual or intentionally missing modules do not have an actual module
  }

  if (
    !factoryResult ||
    typeof factoryResult === "function"
  ) {
    if (actualModule && typeof actualModule === "object" && "default" in actualModule) {
      return {
        ...actualModule,
        __esModule: actualModule.__esModule ?? true,
        default: factoryResult,
      };
    }

    return factoryResult;
  }

  if (Array.isArray(factoryResult) || typeof factoryResult !== "object") {
    return factoryResult;
  }

  const mergedModule = { ...actualModule };
  const factoryDescriptors = Object.getOwnPropertyDescriptors(factoryResult);
  const esModuleDescriptor =
    factoryDescriptors.__esModule ??
    Object.getOwnPropertyDescriptor(actualModule, "__esModule") ?? {
      configurable: true,
      enumerable: true,
      value: true,
      writable: true,
    };

  delete factoryDescriptors.__esModule;

  for (const [key, descriptor] of Object.entries(factoryDescriptors)) {
    Object.defineProperty(mergedModule, key, {
      configurable: true,
      enumerable: descriptor.enumerable ?? true,
      ...(descriptor.get || descriptor.set
        ? {
            get: descriptor.get,
            set: descriptor.set,
          }
        : {
            value: descriptor.value,
            writable: descriptor.writable ?? true,
          }),
    });
  }

  Object.defineProperty(mergedModule, "__esModule", {
    configurable: true,
    enumerable: esModuleDescriptor.enumerable ?? true,
    ...(esModuleDescriptor.get || esModuleDescriptor.set
      ? {
          get: esModuleDescriptor.get,
          set: esModuleDescriptor.set,
        }
      : {
          value: esModuleDescriptor.value,
          writable: esModuleDescriptor.writable ?? true,
        }),
  });

  return mergedModule;
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
  jestCompat.doMock = (moduleName, factory) =>
    jestCompat.mock(moduleName, factory);
  jestCompat.useFakeTimers = () => {
    fakeClock?.uninstall();
    fakeClock = FakeTimers.withGlobal(globalThis).install({
      now: Date.now(),
      shouldAdvanceTime: false,
    });
    syncWindowTimerGlobals();
    return bunJest;
  };
  jestCompat.useRealTimers = () => {
    fakeClock?.uninstall();
    fakeClock = null;
    syncWindowTimerGlobals();
    return bunJest;
  };
  jestCompat.advanceTimersByTime = (ms) => {
    fakeClock?.tick(ms);
    syncWindowTimerGlobals();
    return bunJest;
  };
  jestCompat.runAllTimers = () => {
    fakeClock?.runAll();
    syncWindowTimerGlobals();
    return bunJest;
  };
  jestCompat.runOnlyPendingTimers = () => {
    fakeClock?.runToLast();
    syncWindowTimerGlobals();
    return bunJest;
  };
  jestCompat.clearAllTimers = () => {
    fakeClock?.reset();
    syncWindowTimerGlobals();
    return bunJest;
  };
  jestCompat.setSystemTime = (value) => {
    if (fakeClock) {
      fakeClock.setSystemTime(value);
      syncWindowTimerGlobals();
      return bunJest;
    }

    return bunJest.setSystemTime(value);
  };
  jestCompat.now = () => {
    if (fakeClock) {
      return fakeClock.now;
    }

    return bunJest.now();
  };
  jestCompat.resetAllMocks = () => {
    bunJest.clearAllMocks();
    bunJest.restoreAllMocks();
    return bunJest;
  };
  jestCompat.resetModules = () => {
    bunMock.restore();
    return bunJest;
  };
  jestCompat.isolateModulesAsync = async (callback) => {
    return await callback();
  };

  jestCompat.mock = (moduleName, factory) => {
    const { resolvedModule } = resolveModule(moduleName);
    const moduleFactoryResult = factory
      ? mergeFactoryResultWithActual(jestCompat, moduleName, factory())
      : {
          __esModule: true,
          ...jestCompat.createMockFromModule(moduleName),
        };
    const mockTargets = new Set([moduleName, resolvedModule]);

    if (path.isAbsolute(resolvedModule)) {
      mockTargets.add(pathToFileURL(resolvedModule).href);
    }

    for (const mockTarget of mockTargets) {
      bunMock.module(mockTarget, () => moduleFactoryResult);
    }

    return bunJest;
  };
}

module.exports = { applyBunJestCompat };
