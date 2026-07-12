import { type calendar_v3 } from "@googleapis/calendar";
import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import { Resource_Sync } from "@core/types/sync.types";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import calendarService from "@backend/calendar/services/calendar.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { eventRepository } from "@backend/event/event.repository";
import { sseServer } from "@backend/servers/sse/sse.server";
import {
  createSyncImport,
  type SyncImport,
} from "@backend/sync/services/import/google-import.service";
import {
  getSync,
  removeSyncEntry,
  updateSync,
} from "@backend/sync/services/records/sync-records.repository";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";

const logger = Logger("app:google-calendarlist.service");

type ReconcileResult = { outcome: "RECONCILED" | "IGNORED" };

/**
 * Per-user serialization: concurrent webhook deliveries for the same user
 * must not race each other (e.g. double-importing a newly-added calendar or
 * double-starting a watch). A call for a user whose reconcile is already in
 * flight chains after it instead of running in parallel; the map entry is
 * cleaned up once the last chained run settles.
 */
const inFlightByUser = new Map<string, Promise<unknown>>();

async function reconcileCalendarList(
  context: GoogleRequestContext,
  userId: string,
): Promise<ReconcileResult> {
  const previous = inFlightByUser.get(userId) ?? Promise.resolve();
  const run = previous
    .catch(() => undefined)
    .then(() => runReconcile(context, userId));

  inFlightByUser.set(userId, run);

  try {
    return await run;
  } finally {
    if (inFlightByUser.get(userId) === run) {
      inFlightByUser.delete(userId);
    }
  }
}

async function runReconcile(
  context: GoogleRequestContext,
  userId: string,
): Promise<ReconcileResult> {
  // Re-read at run time (not passed in as a param) so a call that was
  // queued behind another sees that predecessor's already-advanced token.
  const sync = await getSync({ userId });
  const storedToken = sync?.google?.calendarlist?.find(
    (entry) => entry.gCalendarId === Resource_Sync.CALENDAR,
  )?.nextSyncToken;

  if (!storedToken) {
    throw error(
      SyncError.NoSyncToken,
      `Calendarlist notification not handled because no sync token was found for user: ${userId}`,
    );
  }

  const items: calendar_v3.Schema$CalendarListEntry[] = [];
  let finalToken: string | undefined;

  for await (const page of gcalService.getAllCalendarListPages(context, {
    nextSyncToken: storedToken,
  })) {
    items.push(...(page.items ?? []));
    if (page.nextSyncToken) finalToken = page.nextSyncToken;
  }

  if (!finalToken) {
    // getAllCalendarListPages always yields a nextSyncToken on whichever
    // page ends pagination (it throws GcalError.PaginationNotSupported
    // otherwise), so this is unreachable - kept only to narrow the type.
    throw error(
      SyncError.NoSyncToken,
      `Calendarlist delta finished without a sync token for user: ${userId}`,
    );
  }

  if (items.length === 0) {
    if (finalToken !== storedToken) {
      await updateSync(Resource_Sync.CALENDAR, userId, Resource_Sync.CALENDAR, {
        nextSyncToken: finalToken,
      });
    }

    return { outcome: "IGNORED" };
  }

  // A calendar showing up as deleted/hidden in a delta must be archived,
  // not skipped - A2's "ineligible" filter only applies to the *initial*
  // full-list import, where skipping is enough because there's no existing
  // row to reconcile away.
  const removals = items.filter(
    (entry) => entry.deleted === true || entry.hidden === true,
  );
  const upserts = items.filter(
    (entry) => entry.deleted !== true && entry.hidden !== true,
  );

  // Snapshot taken before this run's own writes. Deciding "is this
  // calendar's event import brand new" from this fixed point (rather than
  // re-checking after each write) keeps every entry in this delta judged
  // against the same state, and correctly reflects an earlier run's
  // completed import when this call is itself a duplicate/retried delivery.
  // Only entries holding a nextSyncToken count: a mid-failed import leaves
  // an entry with just a nextPageToken checkpoint, and importAllEvents must
  // run again to resume it from that checkpoint.
  const alreadyImportedGCalIds = new Set(
    (sync?.google?.events ?? [])
      .filter((entry) => entry.nextSyncToken)
      .map((entry) => entry.gCalendarId),
  );

  const affectedHexIds = new Set<string>();
  const eventsChangedHexIds = new Set<string>();
  let importedCount = 0;

  for (const entry of removals) {
    const gCalendarId = entry.id;
    if (!gCalendarId) continue;

    // Only tear down calendars Compass actually knows about; a removal for
    // a calendar that was never imported has nothing to reconcile away.
    const row = await calendarService.archiveGoogleCalendar(
      userId,
      gCalendarId,
    );
    if (!row) continue;

    affectedHexIds.add(row._id.toHexString());

    await stopWatchIfPresent(userId, gCalendarId, context);
    await removeSyncEntry(Resource_Sync.EVENTS, userId, gCalendarId);
    await eventRepository.deleteByCalendarIds([row._id]);

    if (row.isVisible) eventsChangedHexIds.add(row._id.toHexString());
  }

  let syncImport: SyncImport | undefined;

  if (upserts.length > 0) {
    const { records } = await calendarService.upsertGoogleCalendarEntries(
      userId,
      upserts,
    );

    for (const record of records) {
      if (record.source.provider !== "google") continue;

      const hexId = record._id.toHexString();
      const gCalendarId = record.source.calendarId;
      affectedHexIds.add(hexId);

      if (record.access === "freeBusyReader") {
        // A7: freeBusyReader calendars never manufacture event records -
        // tear down anything left behind by a prior, more-permissive role.
        await stopWatchIfPresent(userId, gCalendarId, context);
        await removeSyncEntry(Resource_Sync.EVENTS, userId, gCalendarId);
        await eventRepository.deleteByCalendarIds([record._id]);
        continue;
      }

      if (!alreadyImportedGCalIds.has(gCalendarId)) {
        syncImport ??= await createSyncImport(context);
        await syncImport.importAllEvents(userId, record, 2500);
        importedCount += 1;
        if (record.isVisible) eventsChangedHexIds.add(hexId);
      }

      // Idempotent (already-watching-guarded) and HTTPS-gated internally,
      // so it's safe to call unconditionally for every event-capable
      // calendar in this delta, not just newly-imported ones.
      await googleWatchService.startGoogleWatches(
        userId,
        [{ gCalendarId }],
        context,
      );
    }

    const userObjectId = new ObjectId(userId);
    const clearedIds = await clearStalePrimaryFlags(userObjectId, records);
    clearedIds.forEach((id) => affectedHexIds.add(id.toHexString()));
  }

  // Advance the token only after every removal/upsert/primary-cleanup step
  // above has succeeded - an error anywhere above must leave the stored
  // token where it was so Google's redelivery retries the same delta.
  await updateSync(Resource_Sync.CALENDAR, userId, Resource_Sync.CALENDAR, {
    nextSyncToken: finalToken,
  });

  if (affectedHexIds.size > 0) {
    sseServer.publishCalendarsChanged(userId, [
      ...affectedHexIds,
    ] as CalendarId[]);
  }

  eventsChangedHexIds.forEach((hexId) => {
    sseServer.publishEventsChanged(userId, {
      calendarId: hexId as CalendarId,
      eventIds: [] as EventId[],
      reason: "reconciled",
    });
  });

  logger.info(
    `CalendarList reconciled for user: ${userId} (upserted=${upserts.length} archived=${removals.length} imported=${importedCount})`,
  );

  return { outcome: "RECONCILED" };
}

async function stopWatchIfPresent(
  userId: string,
  gCalendarId: string,
  context: GoogleRequestContext,
): Promise<void> {
  const watch = await mongoService.watch.findOne({
    user: userId,
    gCalendarId,
  });
  if (!watch) return;

  await googleWatchService.stopWatch(
    userId,
    watch._id.toString(),
    watch.resourceId,
    context,
  );
}

/**
 * Clears `isPrimary` on every OTHER google calendar the user has once a
 * delta entry claims it. Reads the stale rows directly from Mongo rather
 * than from `records`, because the calendar losing primary status often
 * doesn't appear in this delta at all (Google only resends the entry that
 * changed).
 */
async function clearStalePrimaryFlags(
  userObjectId: ObjectId,
  records: CalendarRecord[],
): Promise<ObjectId[]> {
  const primaryClaims = records.filter((record) => record.isPrimary);
  if (primaryClaims.length === 0) return [];

  // Google should only ever mark one calendar primary; if a single delta
  // somehow claims it twice, the later entry wins.
  const winner = primaryClaims[primaryClaims.length - 1]!;
  if (winner.source.provider !== "google") return [];
  const winnerGCalendarId = winner.source.calendarId;

  const staleRows = await mongoService.calendar
    .find({
      userId: userObjectId,
      "source.provider": "google",
      "source.calendarId": { $ne: winnerGCalendarId },
      isPrimary: true,
    })
    .toArray();

  if (staleRows.length === 0) return [];

  await mongoService.calendar.updateMany(
    {
      userId: userObjectId,
      "source.provider": "google",
      "source.calendarId": { $ne: winnerGCalendarId },
      isPrimary: true,
    },
    { $set: { isPrimary: false, updatedAt: new Date() } },
  );

  return staleRows.map((row) => row._id);
}

export const googleCalendarListService = {
  reconcileCalendarList,
};
