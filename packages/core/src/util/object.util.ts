/**
 * Checks if a value is a plain object literal (created with {} or Object.create(null)).
 * Returns false for class instances, module exports, functions, etc.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  // Check if it's a plain object by verifying the prototype chain
  const proto = Object.getPrototypeOf(value);

  // Object.create(null) has null prototype
  if (proto === null) {
    return true;
  }

  // Regular plain objects have Object.prototype as their direct prototype
  // and Object.prototype's constructor is Object
  return (
    proto === Object.prototype &&
    proto.constructor === Object &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = Record<string, any>;

/**
 * Recursively clones a plain object. Non-plain objects are returned by reference.
 */
function clonePlainObject<T>(value: T): T {
  if (!isPlainObject(value)) {
    return value;
  }

  const result = {} as AnyObject;
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = clonePlainObject((value as AnyObject)[key]);
    }
  }
  return result as T;
}

/**
 * Deep merges multiple source objects into the first object.
 * Similar to lodash.merge - MUTATES the first non-null argument.
 *
 * - Plain objects are recursively merged
 * - Arrays and primitives from later sources override earlier ones
 * - Non-plain objects (class instances, modules) are preserved by reference
 * - Returns the first non-null source (mutated with merged properties)
 *
 * @example
 * deepMerge({a: {x: 1}}, {a: {y: 2}}) // => {a: {x: 1, y: 2}}
 * deepMerge({arr: [1]}, {arr: [2, 3]}) // => {arr: [2, 3]}
 */
export function deepMerge<T extends AnyObject>(
  ...sources: Array<Partial<T> | AnyObject | undefined | null>
): T {
  // Find the first non-null source to use as the target
  let target: AnyObject | null = null;

  for (const source of sources) {
    if (source == null) continue;

    if (target === null) {
      // First non-null source becomes the target (we'll mutate it)
      target = source as AnyObject;
      continue;
    }

    // Merge subsequent sources into the target
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceVal = source[key];
        const targetVal = target[key];

        if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
          // Both are plain objects - recursively merge (mutate targetVal)
          deepMerge(targetVal, sourceVal);
        } else if (isPlainObject(sourceVal)) {
          // Source is plain object but target isn't - clone source to avoid mutation
          target[key] = clonePlainObject(sourceVal);
        } else {
          // Source is not a plain object - assign by reference
          target[key] = sourceVal;
        }
      }
    }
  }

  return (target ?? {}) as T;
}
