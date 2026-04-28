export function resolveCommandPalette<T>(moduleValue: T): T {
  // Bun's __toESM(mod, nodeInterop=1) wraps CJS+__esModule modules so
  // .default can point at the whole export object. Unwrap one level to reach
  // the actual component function.
  const maybeWrapped = moduleValue as T & { default?: T };

  return maybeWrapped.default ?? moduleValue;
}
