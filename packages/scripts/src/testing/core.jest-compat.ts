import { jest as bunJest, mock as bunMock } from "bun:test";
import { createRequire } from "node:module";

type JestCompat = {
  mock(moduleName: string, factory?: () => unknown): typeof bunJest;
  requireActual<T>(moduleName: string): T;
};

const actualModules = new Map<string, unknown>();
const jestCompat = bunJest as unknown as JestCompat;

function getCallerRequire(): ReturnType<typeof createRequire> {
  const stack = new Error().stack?.split("\n") ?? [];

  for (const frame of stack.slice(2)) {
    const match =
      frame.match(/\((.*):\d+:\d+\)$/) ?? frame.match(/at (.*):\d+:\d+$/);
    const file = match?.[1];

    if (file && file !== __filename) {
      return createRequire(file);
    }
  }

  return require;
}

function resolveModule(moduleName: string) {
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

jestCompat.requireActual = <T>(moduleName: string): T => {
  const { callerRequire, resolvedModule } = resolveModule(moduleName);

  if (!actualModules.has(resolvedModule)) {
    actualModules.set(resolvedModule, callerRequire(moduleName));
  }

  return actualModules.get(resolvedModule) as T;
};

jestCompat.mock = (moduleName: string, factory?: () => unknown) => {
  const actualModule = jestCompat.requireActual(moduleName);
  const { resolvedModule } = resolveModule(moduleName);

  bunMock.module(resolvedModule, () => {
    return factory ? factory() : actualModule;
  });

  return bunJest;
};
