export function resolveDefaultExport<T>(moduleValue: T): T {
  // Bun's __toESM(mod, nodeInterop=1) can wrap CJS+__esModule modules so
  // .default points at the whole export object. Unwrap one level to reach the
  // actual component function.
  const maybeWrapped = moduleValue as T & { default?: T };

  return maybeWrapped.default ?? moduleValue;
}
