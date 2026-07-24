import { Logger } from "@core/logger/winston.logger";
import { type ChangeFeedCursor } from "@core/types/sync/change-feed.contracts";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";
import { sseServer } from "@backend/servers/sse/sse.server";
import { syncInvalidationToServerMessages } from "@backend/servers/sse/sync-invalidation.to-server-message";

const logger = Logger("app:sse.sync-change-feed");

const POLL_INTERVAL_MS = 2000;
const ERROR_BACKOFF_MS = 5000;

interface Poller {
  stop: () => void;
}

// While a user has at least one SSE connection and Sync is configured, poll
// GET /internal/changes and publish typed browser SSE. Cursor is in-memory per
// user for the life of the connection set; reconnect starts from now.
class SyncChangeFeedBridge {
  readonly #pollers = new Map<string, Poller>();

  onSubscribe(userId: string): void {
    if (!getSyncServiceClient()) return;
    if (this.#pollers.has(userId)) return;
    this.#pollers.set(userId, this.#start(userId));
  }

  onUnsubscribe(userId: string): void {
    if (sseServer.subscriberCount(userId) > 0) return;
    const poller = this.#pollers.get(userId);
    if (!poller) return;
    poller.stop();
    this.#pollers.delete(userId);
  }

  #start(userId: string): Poller {
    let stopped = false;
    let cursor: ChangeFeedCursor | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delayMs: number) => {
      if (stopped) return;
      timer = setTimeout(() => {
        void tick();
      }, delayMs);
      timer.unref?.();
    };

    const tick = async () => {
      if (stopped) return;
      const client = getSyncServiceClient();
      if (!client) {
        schedule(ERROR_BACKOFF_MS);
        return;
      }

      const result = await client.getChanges(toSyncPrincipal(userId), cursor);
      if (stopped) return;

      if (!result.ok) {
        logger.warn(
          `Sync change-feed poll failed for user ${userId}: ${result.error.kind}`,
        );
        schedule(ERROR_BACKOFF_MS);
        return;
      }

      const page = result.value;
      if (page.kind === "resyncRequired") {
        // Broad invalidate; client refetches canonical state. Resume from now.
        sseServer.publishCalendarsChanged(userId, []);
        cursor = null;
        schedule(POLL_INTERVAL_MS);
        return;
      }

      for (const envelope of page.invalidations) {
        for (const message of syncInvalidationToServerMessages(
          envelope.invalidation,
        )) {
          sseServer.publish(userId, message);
        }
      }
      cursor = page.nextCursor;
      schedule(POLL_INTERVAL_MS);
    };

    // Prime with a from-now watermark, then poll.
    schedule(0);

    return {
      stop: () => {
        stopped = true;
        if (timer !== undefined) clearTimeout(timer);
      },
    };
  }
}

export const syncChangeFeedBridge = new SyncChangeFeedBridge();
