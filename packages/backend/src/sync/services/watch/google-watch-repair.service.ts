import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { Resource_Sync } from "@core/types/sync.types";
import { type Schema_Watch } from "@core/types/watch.types";
import {
  createGoogleRequestContext,
  type GoogleRequestContext,
} from "@backend/common/services/gcal/gcal.context";
import {
  isFullSyncRequired,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { googleCalendarListService } from "@backend/sync/services/calendarlist/google-calendarlist.service";
import { isMissingGoogleRefreshToken } from "@backend/sync/services/google-sync/google-sync.errors";
import { pruneGoogleDataAndNotifyRevoked } from "@backend/sync/services/google-sync/google-sync.revoked";
import {
  createSyncImport,
  type SyncImport,
} from "@backend/sync/services/import/google-import.service";
import {
  acquireWatchRepairLease,
  getWatchRepairState,
  markWatchRepairAttempt,
  releaseWatchRepairLease,
} from "@backend/sync/services/records/sync-records.repository";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import {
  type GoogleWatchStateInspection,
  GoogleWatchStateStatus,
  inspectGoogleWatchState,
} from "@backend/sync/services/watch/google-watch-state";

const logger = Logger("app:google-watch-repair");

/** How long a completed (or skipped) attempt suppresses the next one. */
const WATCH_REPAIR_COOLDOWN_MS = 5 * 60 * 1000;
/** Upper bound on one repair run; also how long a crashed lease holder
 *  blocks a new attempt before the lease is considered abandoned. */
const WATCH_REPAIR_LEASE_MS = 10 * 60 * 1000;

export type GoogleWatchRepairAction =
  | "NONE"
  | "HEALTHY"
  | "SKIPPED"
  | "REFRESHED"
  | "REPAIRED"
  | "FULL_REPAIR_STARTED"
  | "PRUNED";

export type GoogleWatchRepairResult = {
  action: GoogleWatchRepairAction;
  reason?: string;
  inspection: GoogleWatchStateInspection;
};

const withinCooldown = (lastAttemptAt: Date | null): boolean =>
  lastAttemptAt !== null &&
  Date.now() - lastAttemptAt.getTime() < WATCH_REPAIR_COOLDOWN_MS;

/**
 * Dynamic import breaks the module cycle with google-sync.service: that
 * module imports this one statically (its sync-start hot path calls
 * `repairGoogleWatchesForUser` directly), so the edge back to it has to be
 * the dynamic one - same pattern as google-watch.service.ts:192-193.
 */
async function startFullRepair(userId: string): Promise<void> {
  const { googleCalendarSyncService } = await import(
    "@backend/sync/services/google-sync/google-sync.service"
  );
  await googleCalendarSyncService.repairGoogleCalendarSync(userId);
}

async function refreshExpiringWatches(
  userId: string,
  context: GoogleRequestContext,
  watchesToRefresh: Schema_Watch[],
): Promise<void> {
  await Promise.all(
    watchesToRefresh.map((watch) =>
      googleWatchService.refreshWatch(
        userId,
        {
          gCalendarId: watch.gCalendarId,
          channelId: watch._id.toString(),
          resourceId: watch.resourceId,
          // Unused by refreshWatch's own body (stop-then-start doesn't
          // need it) but required by the Params_WatchEvents type.
          expiration: watch.expiration.getTime().toString(),
        },
        context,
      ),
    ),
  );
}

async function stopUnhealthyWatches(
  userId: string,
  context: GoogleRequestContext,
  watches: Schema_Watch[],
): Promise<void> {
  const seen = new Set<string>();
  const unique = watches.filter((watch) => {
    const id = watch._id.toString();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  await Promise.all(
    unique.map((watch) =>
      googleWatchService.stopWatch(
        userId,
        watch._id.toString(),
        watch.resourceId,
        context,
      ),
    ),
  );
}

async function catchUpEventCalendars(
  userId: string,
  syncImport: SyncImport,
  gCalendarIds: string[],
): Promise<void> {
  const userObjectId = new ObjectId(userId);

  for (const gCalendarId of gCalendarIds) {
    const record = await mongoService.calendar.findOne({
      userId: userObjectId,
      "source.provider": "google",
      "source.calendarId": gCalendarId,
    });

    // No CalendarRecord (e.g. archived through some other path since the
    // inspection ran) means there's nothing left to catch up on - starting
    // its watch above already did the only repair this id still needed.
    if (!record) continue;

    await syncImport.importLatestEvents(userId, record);
  }
}

/**
 * Stops every unhealthy watch, (re)starts a fresh watch for every expected
 * id left without one, then converges any events missed while unwatched.
 * The "needs a watch" set is derived from the pre-repair inspection
 * snapshot: missing ids, expired-and-expected ids, and duplicated ids
 * (whose copies were ALL just stopped above, so each needs one fresh
 * watch). `startGoogleWatches`'s already-watching guard makes over-asking
 * harmless, so this stays a one-pass, non-recursive repair.
 */
async function repairWatches(
  userId: string,
  context: GoogleRequestContext,
  inspection: GoogleWatchStateInspection,
): Promise<void> {
  await stopUnhealthyWatches(userId, context, [
    ...inspection.duplicateWatches,
    ...inspection.staleWatches,
    ...inspection.expiredWatches,
  ]);

  const expiredExpectedIds = inspection.expiredWatches
    .map((watch) => watch.gCalendarId)
    .filter((gCalendarId) =>
      inspection.expectedWatchCalendarIds.includes(gCalendarId),
    );
  const duplicatedIds = inspection.duplicateWatches.map(
    (watch) => watch.gCalendarId,
  );
  const idsNeedingWatch = Array.from(
    new Set([
      ...inspection.missingWatchCalendarIds,
      ...expiredExpectedIds,
      ...duplicatedIds,
    ]),
  );

  if (idsNeedingWatch.length === 0) return;

  await googleWatchService.startGoogleWatches(
    userId,
    idsNeedingWatch.map((gCalendarId) => ({ gCalendarId })),
    context,
  );

  const calendarListId = Resource_Sync.CALENDAR as string;

  if (idsNeedingWatch.includes(calendarListId)) {
    await googleCalendarListService.reconcileCalendarList(context, userId);
  }

  const eventCalendarIds = idsNeedingWatch.filter(
    (gCalendarId) => gCalendarId !== calendarListId,
  );

  if (eventCalendarIds.length > 0) {
    const syncImport = await createSyncImport(context);
    await catchUpEventCalendars(userId, syncImport, eventCalendarIds);
  }
}

const countsOf = (inspection: GoogleWatchStateInspection): string =>
  `expected=${inspection.expectedWatchCalendarIds.length} ` +
  `missing=${inspection.missingWatchCalendarIds.length} ` +
  `expired=${inspection.expiredWatches.length} ` +
  `duplicate=${inspection.duplicateWatches.length} ` +
  `stale=${inspection.staleWatches.length} ` +
  `refresh=${inspection.watchesToRefresh.length}`;

/**
 * Acts on `inspectGoogleWatchState`'s result: refreshes soon-to-expire
 * watches, repairs missing/duplicated/stale/expired ones (with catch-up
 * import for anything that may have missed a notification while
 * unwatched), or kicks off a full resync when Compass's own sync state is
 * unusable. A per-user Mongo lease plus a persisted cooldown make this
 * cheap and multi-process safe to call defensively/often (SSE subscribe,
 * sync-start's ignored path, scheduled maintenance) - a crashed lease
 * holder is recovered from once `leaseExpiresAt` passes.
 */
async function repairGoogleWatchesForUser(
  userId: string,
): Promise<GoogleWatchRepairResult> {
  const inspection = await inspectGoogleWatchState(userId);

  if (inspection.status === GoogleWatchStateStatus.NOT_APPLICABLE) {
    return { action: "NONE", inspection };
  }

  if (inspection.status === GoogleWatchStateStatus.HEALTHY) {
    return { action: "HEALTHY", inspection };
  }

  // Checked before the lease so a cooldown skip never churns a lease write.
  const { lastAttemptAt } = await getWatchRepairState(userId);

  if (withinCooldown(lastAttemptAt)) {
    logger.debug(
      `Google watch repair SKIPPED (COOLDOWN) for user: ${userId}, status: ${inspection.status}, ${countsOf(inspection)}`,
    );
    return { action: "SKIPPED", reason: "COOLDOWN", inspection };
  }

  const acquired = await acquireWatchRepairLease(userId, WATCH_REPAIR_LEASE_MS);

  if (!acquired) {
    logger.debug(
      `Google watch repair SKIPPED (LOCKED) for user: ${userId}, status: ${inspection.status}, ${countsOf(inspection)}`,
    );
    return { action: "SKIPPED", reason: "LOCKED", inspection };
  }

  await markWatchRepairAttempt(userId);

  try {
    if (inspection.status === GoogleWatchStateStatus.FULL_REPAIR_REQUIRED) {
      await startFullRepair(userId);
      logger.info(
        `Google watch repair FULL_REPAIR_STARTED for user: ${userId}, reason: ${inspection.reason}`,
      );
      return { action: "FULL_REPAIR_STARTED", inspection };
    }

    const context = await createGoogleRequestContext(userId);

    if (inspection.status === GoogleWatchStateStatus.REFRESH_REQUIRED) {
      await refreshExpiringWatches(
        userId,
        context,
        inspection.watchesToRefresh,
      );
      logger.info(
        `Google watch repair REFRESHED for user: ${userId}, ${countsOf(inspection)}`,
      );
      return { action: "REFRESHED", inspection };
    }

    // Only REPAIR_REQUIRED remains.
    await repairWatches(userId, context, inspection);
    logger.info(
      `Google watch repair REPAIRED for user: ${userId}, reason: ${inspection.reason}, ${countsOf(inspection)}`,
    );
    return { action: "REPAIRED", inspection };
  } catch (err) {
    if (isMissingGoogleRefreshToken(err) || isInvalidGoogleToken(err)) {
      await pruneGoogleDataAndNotifyRevoked(userId, "watch repair");
      logger.info(`Google watch repair PRUNED for user: ${userId}`);
      return { action: "PRUNED", inspection };
    }

    if (isFullSyncRequired(err)) {
      await startFullRepair(userId);
      logger.info(
        `Google watch repair FULL_REPAIR_STARTED (during catch-up) for user: ${userId}`,
      );
      return { action: "FULL_REPAIR_STARTED", inspection };
    }

    throw err;
  } finally {
    await releaseWatchRepairLease(userId);
  }
}

export const googleWatchRepairService = {
  repairGoogleWatchesForUser,
};
