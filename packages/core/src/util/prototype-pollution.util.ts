// Keys that let an attacker reach Object.prototype (or a constructor) through
// a recursive merge/assign. Untrusted JSON -- request bodies, third-party API
// payloads -- must never carry them into a deep merge, even when the merge
// implementation claims to guard them itself.
const POLLUTING_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;

  const proto = Object.getPrototypeOf(value) as object | null;

  return proto === Object.prototype || proto === null;
}

/**
 * Deep-copies untrusted JSON, dropping every prototype-polluting key.
 *
 * Values that aren't plain objects or arrays (dates, class instances,
 * primitives) are passed through untouched -- they aren't merge targets that
 * can walk into a prototype.
 */
export function stripPrototypePollutingKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripPrototypePollutingKeys(item)) as T;
  }

  if (!isPlainJsonObject(value)) return value;

  const sanitized: Record<string, unknown> = {};

  for (const key of Object.getOwnPropertyNames(value)) {
    if (POLLUTING_KEYS.has(key)) continue;

    sanitized[key] = stripPrototypePollutingKeys(
      (value as Record<string, unknown>)[key],
    );
  }

  return sanitized as T;
}
