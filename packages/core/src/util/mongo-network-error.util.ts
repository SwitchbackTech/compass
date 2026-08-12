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
  /getaddrinfo\s+ESERVFAIL/i,
  /getaddrinfo\s+ENOTFOUND/i,
  /getaddrinfo\s+EAI_AGAIN/i,
  /\bECONNRESET\b/i,
  /\bETIMEDOUT\b/i,
  /\bECONNREFUSED\b/i,
  /server monitor timeout/i,
  /interrupted due to server monitor timeout/i,
  /connection.*(closed|reset|timed?\s*out)/i,
  /server selection timed?\s*out/i,
  /no connection available/i,
  /pool.*cleared/i,
];

function errorName(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  return error.name;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

export function isTransientMongoNetworkError(error: unknown): boolean {
  const name = errorName(error);
  if (name !== undefined && TRANSIENT_MONGO_ERROR_NAMES.has(name)) {
    return true;
  }

  const message = errorMessage(error);
  if (message.length === 0) return false;

  return TRANSIENT_MONGO_MESSAGE_PATTERNS.some((pattern) =>
    pattern.test(message),
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

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < attempts && isTransientMongoNetworkError(error);
      if (!canRetry) throw error;
      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}
