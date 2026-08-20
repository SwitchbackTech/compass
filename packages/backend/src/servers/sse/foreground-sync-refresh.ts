import { Logger } from "@core/logger/winston.logger";
import { PrincipalIdSchema } from "@core/types/sync/identity.contracts";
import { type SyncServiceClient } from "@backend/common/services/sync-service/sync-service.client";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";
import { sseServer } from "@backend/servers/sse/sse.server";

const logger = Logger("app:sse.foreground-sync-refresh");
// Tick more often than Sync's 30s resource-staleness guard so a change that
// lands just after a successful pull still gets a fallback attempt comfortably
// inside the 60s foreground bound (plus queue/change-feed latency).
const DEFAULT_INTERVAL_MS = 15_000;
const MAX_PRINCIPALS_PER_REQUEST = 500;

export interface ForegroundSyncRefreshDeps {
  client: Pick<SyncServiceClient, "refreshForegroundConnections">;
  sse: Pick<typeof sseServer, "connectedUserIds">;
}

export interface ForegroundSyncRefreshOptions {
  intervalMs?: number;
  schedule?: (tick: () => void, delayMs: number) => { clear: () => void };
}

// One backend-owned loop, rather than one timer per tab. Sync performs the
// per-resource recency check and queue coalescing, so multiple backend replicas
// remain safe even when they observe the same principal.
export class ForegroundSyncRefresh {
  readonly #deps: ForegroundSyncRefreshDeps;
  readonly #intervalMs: number;
  readonly #schedule: NonNullable<ForegroundSyncRefreshOptions["schedule"]>;
  #timer: { clear: () => void } | null = null;
  #stopped = true;

  constructor(
    deps: ForegroundSyncRefreshDeps,
    options: ForegroundSyncRefreshOptions = {},
  ) {
    this.#deps = deps;
    this.#intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.#schedule = options.schedule ?? defaultSchedule;
  }

  start(): void {
    if (!this.#stopped) return;
    this.#stopped = false;
    this.#scheduleNext(this.#intervalMs);
  }

  stop(): void {
    this.#stopped = true;
    this.#timer?.clear();
    this.#timer = null;
  }

  #scheduleNext(delayMs: number): void {
    if (this.#stopped) return;
    this.#timer = this.#schedule(() => void this.#tick(), delayMs);
  }

  async #tick(): Promise<void> {
    if (this.#stopped) return;
    try {
      const principalIds = this.#deps.sse
        .connectedUserIds()
        .map((userId) => PrincipalIdSchema.parse(userId));
      if (principalIds.length === 0) return;
      for (
        let offset = 0;
        offset < principalIds.length;
        offset += MAX_PRINCIPALS_PER_REQUEST
      ) {
        const result = await this.#deps.client.refreshForegroundConnections(
          principalIds.slice(offset, offset + MAX_PRINCIPALS_PER_REQUEST),
        );
        if (!result.ok && result.error.kind !== "conflict") {
          logger.warn(
            `Foreground sync refresh failed: ${result.error.kind} (${result.error.correlationId})`,
          );
        } else if (result.ok && result.value.resources > 0) {
          logger.info(
            `Foreground sync refresh checked ${result.value.resources} stale resource(s): enqueued=${result.value.enqueued} inFlight=${result.value.inFlight}`,
          );
        }
      }
    } catch (error) {
      logger.error(
        `Foreground sync refresh tick threw: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.#scheduleNext(this.#intervalMs);
    }
  }
}

function defaultSchedule(
  tick: () => void,
  delayMs: number,
): { clear: () => void } {
  const timer = setTimeout(tick, delayMs);
  timer.unref?.();
  return { clear: () => clearTimeout(timer) };
}

export const foregroundSyncRefresh = new ForegroundSyncRefresh({
  client: {
    refreshForegroundConnections: (principalIds, correlationId) =>
      getSyncServiceClient().refreshForegroundConnections(
        principalIds,
        correlationId,
      ),
  },
  sse: sseServer,
});
