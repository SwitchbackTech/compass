/**
 * Checks if a value is a plain object (not null, not array, not Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/**
 * Deep merges multiple source objects into a new object.
 * Similar to lodash.merge but implemented with native methods.
 *
 * - Objects are recursively merged
 * - Arrays and primitives from later sources override earlier ones
 * - Returns a new object (does not mutate inputs)
 *
 * @example
 * deepMerge({a: {x: 1}}, {a: {y: 2}}) // => {a: {x: 1, y: 2}}
 * deepMerge({arr: [1]}, {arr: [2, 3]}) // => {arr: [2, 3]}
 */
export function deepMerge<T extends Record<string, unknown>>(
  ...sources: Array<Partial<T> | undefined | null>
): T {
  const result = {} as T;

  for (const source of sources) {
    if (source == null) continue;

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceVal = source[key];
        const resultVal = result[key as keyof T];

        if (isPlainObject(sourceVal) && isPlainObject(resultVal)) {
          (result as Record<string, unknown>)[key] = deepMerge(
            resultVal as Record<string, unknown>,
            sourceVal as Record<string, unknown>,
          );
        } else {
          (result as Record<string, unknown>)[key] = sourceVal;
        }
      }
    }
  }

  return result;
}
