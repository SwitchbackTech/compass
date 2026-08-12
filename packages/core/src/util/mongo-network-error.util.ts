// MongoDB driver / Node DNS failures that usually clear themselves after a
// brief Atlas/network blip. Matching is name + message based so core stays
// free of a hard mongodb runtime dependency.

const TRANSIENT_MONGO_ERROR_NAMES = new Set([
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoServerSelectionError",
  "MongoPoolClearedError",
  "PoolClearedOnNetworkError",
]);

const TRANSIENT_MONGO_MESSAGE_PATTERNS = [
  /getaddrinfo\s+(ESERVFAIL|ENOTFOUND|EAI_AGAIN)/i,
  /\b(ECONNRESET|ETIMEDOUT|ECONNREFUSED)\b/i,
  /server monitor timeout/i,
  /connection.*(closed|reset|timed?\s*out)/i,
  /server selection timed?\s*out/i,
  /no connection available/i,
  /pool.*cleared/i,
];

export function isTransientMongoNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (TRANSIENT_MONGO_ERROR_NAMES.has(error.name)) return true;
  if (error.message.length === 0) return false;
  return TRANSIENT_MONGO_MESSAGE_PATTERNS.some((pattern) =>
    pattern.test(error.message),
  );
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
