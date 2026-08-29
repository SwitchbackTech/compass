import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";

const logger = Logger("app:sync-principal-deletion-retry");
const RETRY_INTERVAL_MS = 10 * 60_000;
const BATCH_SIZE = 100;

/**
 * Sync is a separate service, so it can be unavailable at the exact moment a
 * user deletes their account. Persist the intent first and keep retrying until
 * its provider credentials and cached calendar data are confirmed gone.
 */
class SyncPrincipalDeletionRetryService {
  #timer: ReturnType<typeof setInterval> | undefined;

  async enqueueAndAttempt(userId: string): Promise<void> {
    const now = new Date();
    await mongoService.pendingSyncPrincipalDeletion.updateOne(
      { _id: userId },
      {
        $setOnInsert: { requestedAt: now, attempts: 0 },
        $set: { lastAttemptAt: now },
      },
      { upsert: true },
    );
    await this.attempt(userId);
  }

  async retryPending(): Promise<void> {
    const pending = await mongoService.pendingSyncPrincipalDeletion
      .find({}, { projection: { _id: 1 } })
      .sort({ requestedAt: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    for (const { _id } of pending) {
      await this.attempt(_id);
    }
  }

  start(): void {
    if (this.#timer) return;
    void this.retryPending().catch((error) =>
      logger.error("Could not start pending Sync deletion retries", error),
    );
    this.#timer = setInterval(() => {
      void this.retryPending().catch((error) =>
        logger.error("Could not retry pending Sync deletions", error),
      );
    }, RETRY_INTERVAL_MS);
  }

  stop(): void {
    if (!this.#timer) return;
    clearInterval(this.#timer);
    this.#timer = undefined;
  }

  private async attempt(userId: string): Promise<void> {
    const now = new Date();
    try {
      const result = await getSyncServiceClient().purgePrincipal(
        toSyncPrincipal(userId),
      );
      if (result.ok) {
        await mongoService.pendingSyncPrincipalDeletion.deleteOne({
          _id: userId,
        });
        return;
      }
      logger.warn(
        `Sync principal purge deferred (${result.error.kind}, correlation=${result.error.correlationId})`,
      );
    } catch (error) {
      logger.warn(
        "Sync principal purge deferred after an unexpected error",
        error,
      );
    }

    await mongoService.pendingSyncPrincipalDeletion.updateOne(
      { _id: userId },
      { $set: { lastAttemptAt: now }, $inc: { attempts: 1 } },
    );
  }
}

export const syncPrincipalDeletionRetry =
  new SyncPrincipalDeletionRetryService();
