import { GaxiosError } from "gaxios";
import { Logger } from "@core/logger/winston.logger";

const logger = Logger("app:gcal.retry");

/** 403 reasons Google returns for quota/rate-limit rejections (retryable). */
const RETRYABLE_403_REASONS = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "quotaExceeded",
  "dailyLimitExceeded",
]);

/** Node network error codes that indicate a transient, retryable failure. */
const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
]);

const get403Reasons = (err: GaxiosError): string[] => {
  const data = err.response?.data as
    | { error?: { errors?: Array<{ reason?: string }> } }
    | undefined;

  return (data?.error?.errors ?? [])
    .map(({ reason }) => reason)
    .filter((reason): reason is string => Boolean(reason));
};

/**
 * Classifies whether a Google API failure is worth retrying: rate limits
 * (429, or 403 with a quota/rate-limit reason), 5xx server errors, and
 * network-level failures (no response, or a transient connection error
 * code). Everything else (400, 401, 404, 410, other 403 reasons, etc.) is
 * treated as a real failure and should surface immediately.
 */
export const isRetryableGoogleError = (err: unknown): boolean => {
  if (err instanceof GaxiosError) {
    const status = err.response?.status;

    // No response at all means the request never completed (network-level
    // failure), which is inherently transient.
    if (!err.response) return true;

    if (status === 429) return true;
    if (typeof status === "number" && status >= 500) return true;

    if (status === 403) {
      return get403Reasons(err).some((reason) =>
        RETRYABLE_403_REASONS.has(reason),
      );
    }

    return false;
  }

  const code = (err as { code?: unknown } | null | undefined)?.code;

  return typeof code === "string" && RETRYABLE_NETWORK_CODES.has(code);
};

export interface WithGoogleRetryOptions {
  /** Total attempts, including the first. Defaults to 5. */
  maxAttempts?: number;
  /** Base delay in ms before the first retry. Defaults to 500. */
  baseDelayMs?: number;
  /** Upper bound for the backoff delay, before jitter. Defaults to 30s. */
  maxDelayMs?: number;
  /** Injectable for tests so retries don't actually sleep. */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 30_000;

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Truncated exponential backoff with full jitter: the delay is a uniform
 * random value in [0, min(baseDelayMs * 2^attempt, maxDelayMs)].
 */
export const computeBackoffDelayMs = (
  attempt: number,
  {
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
  }: Pick<WithGoogleRetryOptions, "baseDelayMs" | "maxDelayMs"> = {},
): number => {
  const cap = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);

  return Math.random() * cap;
};

/**
 * Reads a `Retry-After` value off a Gaxios response's `headers`, which is
 * normally a fetch-style `Headers` (has `.get()`) but is handled as a plain
 * object too, defensively.
 */
const readRetryAfterHeader = (headers: unknown): string | undefined => {
  if (!headers || typeof headers !== "object") return undefined;

  const getter = (headers as { get?: unknown }).get;

  if (typeof getter === "function") {
    const value = (headers as { get(name: string): string | null }).get(
      "retry-after",
    );

    return value ?? undefined;
  }

  const bag = headers as Record<string, unknown>;
  const value = bag["retry-after"] ?? bag["Retry-After"];

  return typeof value === "string" ? value : undefined;
};

/**
 * Parses a `Retry-After` header as integer seconds, Google's only form in
 * practice. The HTTP-date form (and anything else unparseable) is treated as
 * no hint, so the caller falls back to computed backoff.
 */
const parseRetryAfterSeconds = (
  value: string | undefined,
): number | undefined => {
  if (value === undefined) return undefined;

  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) return undefined;

  return Number.parseInt(trimmed, 10);
};

/**
 * A retryable error's `Retry-After` hint, as a delay in ms clamped to
 * `maxDelayMs` -- the same cap computed backoff respects, so a hostile or
 * oversized hint can't stall retries. Returns undefined when the error
 * carries no usable hint.
 */
const getRetryAfterDelayMs = (
  err: unknown,
  maxDelayMs: number,
): number | undefined => {
  if (!(err instanceof GaxiosError)) return undefined;

  const seconds = parseRetryAfterSeconds(
    readRetryAfterHeader(err.response?.headers),
  );

  if (seconds === undefined) return undefined;

  return Math.min(seconds * 1000, maxDelayMs);
};

/**
 * A loggable HTTP status / error code -- never the message, url, or payload,
 * which can carry a raw Google calendar id (often the user's email).
 */
const getLoggableErrorCode = (err: unknown): string | number | undefined => {
  if (err instanceof GaxiosError) {
    return err.response?.status ?? err.status ?? err.code;
  }

  const code = (err as { code?: unknown } | null | undefined)?.code;

  return typeof code === "string" || typeof code === "number"
    ? code
    : undefined;
};

/**
 * Runs `fn`, retrying with truncated exponential backoff (full jitter) on
 * retryable Google API failures (see `isRetryableGoogleError`). When a
 * retryable error carries a `Retry-After` header, its hint is used for the
 * wait instead of the computed backoff. Non-retryable errors and the final
 * attempt's error are rethrown as-is.
 *
 * Logs one structured line -- attempts used, elapsed ms, outcome, and the
 * last error's HTTP status/code -- whenever the call needed at least one
 * retry, whether it eventually succeeded or exhausted its attempts. Silent
 * on the common first-try-success path.
 */
export const withGoogleRetry = async <T>(
  fn: () => Promise<T>,
  opts: WithGoogleRetryOptions = {},
): Promise<T> => {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    sleep = defaultSleep,
  } = opts;

  const startedAt = Date.now();
  let lastErrorCode: string | number | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await fn();

      if (attempt > 0) {
        logger.info("Google API call succeeded after retrying", {
          attempts: attempt + 1,
          elapsedMs: Date.now() - startedAt,
          outcome: "success",
          code: lastErrorCode,
        });
      }

      return result;
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts - 1;

      lastErrorCode = getLoggableErrorCode(err);

      if (!isRetryableGoogleError(err) || isLastAttempt) {
        if (attempt > 0) {
          logger.error("Google API call failed after retrying", {
            attempts: attempt + 1,
            elapsedMs: Date.now() - startedAt,
            outcome: "failure",
            code: lastErrorCode,
          });
        }

        throw err;
      }

      const delayMs =
        getRetryAfterDelayMs(err, maxDelayMs) ??
        computeBackoffDelayMs(attempt, { baseDelayMs, maxDelayMs });

      logger.warn(
        `Retrying Google API call after retryable error (attempt ${attempt + 1}/${maxAttempts}), waiting ${Math.round(delayMs)}ms`,
        err,
      );

      await sleep(delayMs);
    }
  }

  // Unreachable: the loop always either returns or throws.
  throw new Error("withGoogleRetry: exhausted attempts without a result");
};
