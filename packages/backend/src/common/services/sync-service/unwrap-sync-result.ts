import { type Logger } from "@core/logger/winston.logger";
import { throwSyncProxyFailure } from "./sync-proxy-error";
import { type SyncClientResult } from "./sync-service.client";

type LoggerInstance = ReturnType<typeof Logger>;

/**
 * Unwrap a sync client call: return its value, or throw an opaque proxy
 * failure - the specific kind and correlation id are logged server-side, but
 * nothing sync-internal (status codes, identity) reaches the browser.
 *
 * Discriminates the kind exactly the way the read/proxy path already does
 * (throwSyncProxyFailure): only timeout/unavailable are the retryable 503,
 * everything else is a 502. Flattening every kind to 503 was safe while all
 * of them logged at `error`, but the log level now follows the status
 * (logLevelForError downgrades operational 503s to `warn` so a sync restart
 * stops filing GitHub issues). A permanently broken sync - drifted
 * internalAuthToken, broken response contract - reports `unauthorized` or
 * `invalidResponse`, and under the flattened 503 it would have logged at
 * `warn` forever with no exception captured at all.
 */
export function unwrapSyncResult<T>(
  result: SyncClientResult<T>,
  deps: { logger: LoggerInstance; logMessage: string; userMessage: string },
): T {
  if (result.ok) return result.value;

  deps.logger.warn(
    `${deps.logMessage} (${result.error.kind}) ` +
      `[correlationId=${result.error.correlationId}]`,
  );
  throwSyncProxyFailure(result.error.kind, deps.userMessage);
}
