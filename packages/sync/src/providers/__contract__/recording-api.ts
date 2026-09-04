import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SECRET_KEY =
  /^(authorization|access[_-]?token|refresh[_-]?token|id[_-]?token|password|app[_-]?password|client[_-]?secret|cookie)$/i;

const SECRET_SUBSTRING = /token|secret|password|authorization/i;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const BEARER = /Bearer\s+\S+/gi;

/**
 * Wrap a real narrow API and append each call's redacted request/response to
 * `corpusDir/<caseName>.json`. M-12 / A-11 record founder-account corpora
 * with this; the recorded JSON is what the contract fakes replay.
 */
export function recordingApi<T extends object>(
  inner: T,
  corpusDir: string,
  caseName: string,
): T {
  const calls: unknown[] = [];
  return new Proxy(inner, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const invoke = async () => {
          const result = await (
            value as (...innerArgs: unknown[]) => unknown
          ).apply(target, args);
          calls.push({
            method: String(prop),
            args: redactValue(args),
            result: redactValue(result),
          });
          await mkdir(corpusDir, { recursive: true });
          await writeFile(
            join(corpusDir, `${caseName}.json`),
            `${JSON.stringify(calls, null, 2)}\n`,
          );
          return result;
        };
        return invoke();
      };
    },
  }) as T;
}

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(BEARER, "Bearer [REDACTED]").replace(EMAIL, "[email]");
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SECRET_KEY.test(key) || SECRET_SUBSTRING.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactValue(nested);
      }
    }
    return out;
  }
  return value;
}
