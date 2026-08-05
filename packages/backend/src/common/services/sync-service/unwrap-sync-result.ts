import { type Logger } from "@core/logger/winston.logger";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { type SyncClientResult } from "./sync-service.client";

type LoggerInstance = ReturnType<typeof Logger>;

/**
 * Unwrap a sync client call: return its value, or throw the single opaque
 * 503 (SyncConnectionUnavailable) every sync-delegated endpoint throws on
 * failure - the specific kind and correlation id are logged server-side, but
 * nothing sync-internal (status codes, identity) reaches the browser.
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
  throw error(AuthError.SyncConnectionUnavailable, deps.userMessage);
}
