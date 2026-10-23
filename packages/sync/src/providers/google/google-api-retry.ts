import {
  googleStatus,
  hasGoogleRateLimitReason,
  isGoogleTransient,
} from "@sync/providers/google/google-error";
import {
  parseRetryAfterMs,
  withRetryableProviderHttp,
} from "@sync/providers/provider-http-retry.util";

function readGoogleRetryAfterMs(error: unknown): number | undefined {
  const headers = (
    error as {
      response?: { headers?: Record<string, string | string[] | undefined> };
    }
  )?.response?.headers;
  if (!headers) return undefined;
  const raw =
    headers["retry-after"] ??
    headers["Retry-After"] ??
    headers["x-ratelimit-reset"];
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (typeof header !== "string") return undefined;
  if (headers["x-ratelimit-reset"] && header === headers["x-ratelimit-reset"]) {
    const resetSeconds = Number(header);
    if (Number.isFinite(resetSeconds) && resetSeconds > 0) {
      const nowSeconds = Math.floor(Date.now() / 1_000);
      return parseRetryAfterMs(String(Math.max(0, resetSeconds - nowSeconds)));
    }
  }
  return parseRetryAfterMs(header);
}

function isGoogleRetryableHttp(error: unknown): boolean {
  const status = googleStatus(error);
  if (isGoogleTransient(error, status)) {
    return (
      status === 429 ||
      status === 503 ||
      status === undefined ||
      (status >= 500 && status < 600) ||
      (status === 403 && hasGoogleRateLimitReason(error))
    );
  }
  return false;
}

export async function withGoogleApiRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<T> {
  return withRetryableProviderHttp(operation, {
    maxAttempts: options.maxAttempts,
    sleep: options.sleep,
    isRetryable: isGoogleRetryableHttp,
    readRetryAfterMs: readGoogleRetryAfterMs,
  });
}
