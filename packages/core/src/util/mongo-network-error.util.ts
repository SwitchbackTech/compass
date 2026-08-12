// MongoDB driver / Node DNS failures that usually clear themselves after a
// brief Atlas/network blip. Matching is name + message based so core stays
// free of a hard mongodb runtime dependency.
//
// Do NOT name-match MongoServerSelectionError alone: the driver also uses it
// for durable topology/auth/allowlist failures. Those still surface when their
// cause/message is a network blip (walked below).

const TRANSIENT_MONGO_ERROR_NAMES = new Set([
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoPoolClearedError",
  "PoolClearedOnNetworkError",
]);

const TRANSIENT_MONGO_MESSAGE_PATTERNS = [
  /getaddrinfo\s+(ESERVFAIL|ENOTFOUND|EAI_AGAIN)/i,
  /\b(ECONNRESET|ETIMEDOUT|ECONNREFUSED)\b/i,
  /server monitor timeout/i,
  /connection.*(closed|reset|timed?\s*out)/i,
  /no connection available/i,
  /pool.*cleared/i,
];

export function isTransientMongoNetworkError(error: unknown): boolean {
  let current: unknown = error;
  const seen = new WeakSet<object>();

  while (current instanceof Error) {
    if (seen.has(current)) break;
    seen.add(current);

    if (TRANSIENT_MONGO_ERROR_NAMES.has(current.name)) return true;
    const message = current.message;
    if (
      message.length > 0 &&
      TRANSIENT_MONGO_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))
    ) {
      return true;
    }

    current = current.cause;
  }

  return false;
}

export async function withTransientMongoRetry<T>(
  operation: () => Promise<T>,
  options: {
    attempts?: number;
    delayMs?: number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 250;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !isTransientMongoNetworkError(error)) {
        throw error;
      }
      await sleep(delayMs * attempt);
    }
  }
}
