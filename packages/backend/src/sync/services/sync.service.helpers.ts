import dayjs from "dayjs";
import { WithId } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { MapEvent } from "@core/mappers/map.event";
import { Schema_CalendarList } from "@core/types/calendar.types";
import { Schema_Event_Core } from "@core/types/event.types";
import {
  gCalendar,
  gParamsImportAllEvents,
  gSchema$CalendarList,
  gSchema$Event,
} from "@core/types/gcal";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import {
  Payload_Sync_Events,
  Payload_Sync_Refresh,
  Result_Watch_Stop,
  Schema_Sync,
} from "@core/types/sync.types";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { Collections } from "@backend/common/constants/collections";
import { ENV } from "@backend/common/constants/env.constants";
import { EventError } from "@backend/common/constants/error.constants";
import {
  GcalError,
  GenericError,
  SyncError,
} from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import {
  isFullSyncRequired,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import userService from "@backend/user/services/user.service";
import {
  createSync,
  getSync,
  hasUpdatedCompassEventRecently,
  updateSyncTimeBy,
  updateSyncTokenFor,
} from "../util/sync.queries";
import {
  assembleEventOperations,
  categorizeGcalEvents,
  getActiveDeadline,
  isUsingHttps,
  syncExpired,
  syncExpiresSoon,
} from "../util/sync.utils";
import { logSyncOperation } from "./sync.logger";
import syncService from "./sync.service";

/**
 * Helper funcs that include multiple operations (not just DB queries)
 */

const logger = Logger("app:sync.service.helpers");

export const assembleEventImports = (
  userId: string,
  gcal: gCalendar,
  eventSyncPayloads: Schema_Sync["google"]["events"],
) => {
  const syncEvents = eventSyncPayloads.map((eventSync) =>
    importEventsByCalendar(userId, eventSync, gcal),
  );

  return syncEvents;
};

const assembleEventWatchPayloads = (
  sync: Schema_Sync,
  gCalendarIds: string[],
) => {
  const watchPayloads = gCalendarIds.map((gCalId) => {
    const match = sync?.google.events.find((es) => es.gCalendarId === gCalId);
    const eventNextSyncToken = match?.nextSyncToken;
    if (eventNextSyncToken) {
      return { gCalId, nextSyncToken: eventNextSyncToken };
    }

    return { gCalId };
  });

  return watchPayloads;
};

export const getCalendarInfo = (
  sync: WithId<Schema_Sync>,
  resourceId: string,
) => {
  const matches = sync.google.events.filter((g) => {
    return g.resourceId === resourceId;
  });

  if (!matches[0]) {
    throw error(SyncError.NoSyncRecordForUser, "Sync Failed");
  }

  const gCalendarId = matches[0].gCalendarId;
  const nextSyncToken = matches[0].nextSyncToken;

  return {
    userId: sync.user,
    gCalendarId,
    nextSyncToken,
  };
};

export const getCalendarsToSync = async (userId: string, gcal: gCalendar) => {
  const { items, nextSyncToken: calListNextSyncToken } =
    await gcalService.getCalendarlist(gcal);

  if (!calListNextSyncToken) {
    throw error(GcalError.NoSyncToken, "Failed to get Calendar(list)s to sync");
  }

  const gCalendarList = items as gSchema$CalendarListEntry[];

  const primaryGcal = gCalendarList.filter((c) => {
    return c.primary === true;
  })[0] as gSchema$CalendarList;

  const _ccalList = MapCalendarList.toCompass(primaryGcal);
  const cCalendarList = { ..._ccalList, user: userId } as Schema_CalendarList;

  const gCalendarIds = cCalendarList.google.items.map(
    (gcal) => gcal.id,
  ) as string[];

  return {
    cCalendarList,
    gCalendarIds,
    calListNextSyncToken,
  };
};

const getSyncsToRefresh = (sync: Schema_Sync) => {
  const syncsToRefresh: Payload_Sync_Events[] = [];

  sync.google.events.map((s) => {
    const expiry = s.expiration;

    if (!syncExpired(expiry) && syncExpiresSoon(expiry)) {
      syncsToRefresh.push(s);
    }
  });

  return syncsToRefresh;
};

const getSyncToken = (
  pageToken: string | null | undefined,
  syncToken: string | null | undefined,
) => {
  if (pageToken !== undefined && pageToken !== null) {
    return pageToken;
  }

  if (syncToken === undefined || syncToken === null) {
    throw error(
      GenericError.DeveloperError,
      "Failed to get correct sync token",
    );
  }

  return syncToken;
};

const getUpdatedEvents = async (
  gcal: gCalendar,
  gCalendarId: string,
  syncToken: string,
) => {
  const response = await gcalService.getEvents(gcal, {
    calendarId: gCalendarId,
    syncToken,
  });

  if (!response) {
    throw error(SyncError.NoEventChanges, "Import Ignored");
  }

  return response.data;
};

export const hasAnyActiveEventSync = (sync: Schema_Sync) => {
  if (sync.google?.events === undefined) return false;

  for (const es of sync.google.events) {
    const hasSyncFields = es.channelId && es.expiration;
    if (hasSyncFields && !syncExpired(es.expiration)) {
      return true;
    }
  }
  return false;
};

export const importAllEvents = async (
  userId: string,
  gcal: gCalendar,
  calendarId: string,
) => {
  let nextPageToken: string | undefined = undefined;
  let nextSyncToken: string | undefined = undefined;

  let total = 0;

  do {
    const params: gParamsImportAllEvents = {
      calendarId,
      singleEvents: true,
      pageToken: nextPageToken,
    };

    const gEvents = await gcalService.getEvents(gcal, params);

    if (!gEvents || !gEvents.data.items) {
      throw error(EventError.NoGevents, "Potentially missing events");
    }

    if (gEvents.data.items.length > 0) {
      total += gEvents.data.items.length;

      const cEvents = MapEvent.toCompass(
        userId,
        gEvents.data.items,
        Origin.GOOGLE_IMPORT,
      );
      await eventService.createMany(cEvents);
    }

    nextPageToken = gEvents.data.nextPageToken ?? undefined;
    nextSyncToken = gEvents.data.nextSyncToken ?? undefined;
  } while (nextPageToken !== undefined);

  // nextSyncToken is defined when there are no more events
  if (!nextSyncToken) {
    throw error(GcalError.NoSyncToken, "Failed to get sync token");
  }

  return {
    total,
    nextSyncToken,
  };
};

/**
 * Fetches all instances of a recurring event series and returns them as Compass events
 * TODO organize
 */
const getRecurringEventInstances = async (
  userId: string,
  gcal: gCalendar,
  calendarId: string,
  recurringEventId: string,
): Promise<Schema_Event_Core[]> => {
  // Get instances for next 6 months
  const timeMin = new Date().toISOString();
  const timeMax = dayjs().add(6, "months").toISOString();

  console.log("fetching instances for:", recurringEventId);
  const response = await gcalService.getEvents(gcal, {
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    // Use q parameter to filter by recurring event ID since the API doesn't have a direct parameter
    q: recurringEventId,
  });

  if (!response?.data?.items) {
    console.log("no items found for:", recurringEventId);
    return [];
  }

  // Filter to only get events from this recurring series
  const seriesEvents = response.data.items.filter(
    (event) => event.recurringEventId === recurringEventId,
  );

  console.log("series events:", seriesEvents);

  // Convert to Compass events
  const compassEvents = MapEvent.toCompass(
    userId,
    seriesEvents,
    Origin.GOOGLE_IMPORT,
  );

  console.log("compass events:", compassEvents);
  return compassEvents;
};

interface ProcessedEvents {
  regularEvents: Schema_Event_Core[];
  expandedEvents: Schema_Event_Core[];
  toDelete: string[];
}

/**
 * Process events from Google Calendar, handling both regular and recurring events
 */
const processGoogleEvents = async (
  userId: string,
  gcal: gCalendar,
  gCalendarId: string,
  updatedEvents: gSchema$Event[],
): Promise<ProcessedEvents> => {
  const { toDelete, toUpdate } = categorizeGcalEvents(updatedEvents);

  // Handle recurring events
  const expandedEvents: Schema_Event_Core[] = [];
  for (const event of toUpdate) {
    if (
      event.recurringEventId ||
      (event.recurrence && event.recurrence.length > 0)
    ) {
      console.log("recurring event:", event);
      const recurringId = event.recurringEventId || event.id;
      if (!recurringId) continue;

      const instances = await getRecurringEventInstances(
        userId,
        gcal,
        gCalendarId,
        recurringId,
      );
      console.log("# instances:", instances.length);
      expandedEvents.push(...instances);
    }
  }

  // Process regular events
  const regularEvents = MapEvent.toCompass(
    userId,
    toUpdate.filter((e) => !e.recurringEventId && !e.recurrence),
    Origin.GOOGLE_IMPORT,
  );

  return { regularEvents, expandedEvents, toDelete };
};

/**
 * Update database with processed events
 */
const updateDatabase = async (
  userId: string,
  events: ProcessedEvents,
): Promise<{ updated: number; deleted: number }> => {
  const ops = assembleEventOperations(userId, events.toDelete, []);
  let updated = 0;
  let deleted = 0;

  // First handle deletions
  if (ops.length > 0) {
    const result = await mongoService.db
      .collection(Collections.EVENT)
      .bulkWrite(ops);

    if (!result.ok) {
      throw error(
        GenericError.NotSure,
        "Events not updated after notification",
      );
    }

    updated +=
      result.insertedCount + result.upsertedCount + result.modifiedCount;
    deleted += result.deletedCount;
  }

  // Then create/update all events including recurring instances
  const allEvents = [...events.regularEvents, ...events.expandedEvents];
  if (allEvents.length > 0) {
    await eventService.createMany(allEvents);
    updated += allEvents.length;
  }

  console.log("updated:", updated);
  console.log("deleted:", deleted);

  return { updated, deleted };
};

/**
 * Update sync tokens and timestamps
 */
const updateSync = async (
  userId: string,
  gCalendarId: string,
  prevSyncToken: string,
  newSyncToken: string | null | undefined,
) => {
  await updateSyncTimeBy("gCalendarId", gCalendarId, userId);
  await updateSyncTokenIfNeededFor("events", userId, gCalendarId, {
    prev: prevSyncToken,
    curr: newSyncToken as string,
  });
};

export const importEventsByCalendar = async (
  userId: string,
  syncInfo: Payload_Sync_Events,
  gcal?: gCalendar,
) => {
  if (!gcal) gcal = await getGcalClient(userId);
  const { gCalendarId } = syncInfo;

  const noChanges = {
    calendar: gCalendarId,
    result: { updated: 0, deleted: 0 },
  };

  let nextSyncToken: string | null | undefined = syncInfo.nextSyncToken;
  let nextPageToken: string | null | undefined = undefined;
  let totalUpdated = 0;
  let totalDeleted = 0;

  do {
    const syncToken = getSyncToken(nextPageToken, nextSyncToken);
    const response = await getUpdatedEvents(gcal, gCalendarId, syncToken);
    const updatedEvents = response.items || [];

    if (updatedEvents.length === 0) {
      return noChanges;
    }

    // Process events from Google Calendar
    const processedEvents = await processGoogleEvents(
      userId,
      gcal,
      gCalendarId,
      updatedEvents,
    );

    // Log the sync operation
    await logSyncOperation(userId, gCalendarId, {
      updatedEvents,
      summary: {
        toUpdate: updatedEvents,
        toDelete: processedEvents.toDelete,
        resourceId: syncInfo.resourceId,
      },
      operations: assembleEventOperations(userId, processedEvents.toDelete, []),
    });

    // Update database
    const { updated, deleted } = await updateDatabase(userId, processedEvents);

    totalUpdated += updated;
    totalDeleted += deleted;

    nextSyncToken = response.nextSyncToken;
    nextPageToken = response.nextPageToken;
  } while (nextPageToken !== undefined);

  await updateSync(
    userId,
    gCalendarId,
    syncInfo.nextSyncToken as string,
    nextSyncToken,
  );

  return {
    calendar: gCalendarId,
    result: {
      updated: totalUpdated,
      deleted: totalDeleted,
    },
  };
};

export const initSync = async (gcal: gCalendar, userId: string) => {
  const { cCalendarList, gCalendarIds, calListNextSyncToken } =
    await getCalendarsToSync(userId, gcal);

  await createSync(userId, cCalendarList, calListNextSyncToken);

  await calendarService.create(cCalendarList);

  if (isUsingHttps()) {
    await watchEventsByGcalIds(userId, gCalendarIds, gcal);
  } else {
    logger.warn(
      `Skipped gcal watch during sync init because BASEURL does not use HTTPS: '${ENV.BASEURL}'`,
    );
  }

  return gCalendarIds;
};

export const prepSyncMaintenance = async () => {
  const toRefresh = [];
  const toPrune = [];
  const ignored = [];

  const deadline = getActiveDeadline();

  const cursor = mongoService.user.find();
  while (await cursor.hasNext()) {
    const user = await cursor.next();
    const userId = user?._id.toString() as string;

    const sync = await getSync({ userId });
    if (!sync) {
      ignored.push(userId);
      continue;
    }

    const isUserActive = await hasUpdatedCompassEventRecently(userId, deadline);
    if (isUserActive) {
      const syncsToRefresh = getSyncsToRefresh(sync);

      if (syncsToRefresh.length > 0) {
        toRefresh.push({ userId, payloads: syncsToRefresh });
      } else {
        ignored.push(userId);
      }
    } else {
      if (hasAnyActiveEventSync(sync)) {
        toPrune.push(sync.user);
      } else {
        ignored.push(userId);
      }
    }
  }

  return {
    ignored,
    toPrune,
    toRefresh,
  };
};

export const prepSyncMaintenanceForUser = async (userId: string) => {
  const sync = await getSync({ userId });
  if (!sync) {
    return { action: "ignore", reason: "no sync" };
  }

  const deadline = getActiveDeadline();
  const isUserActive = await hasUpdatedCompassEventRecently(userId, deadline);
  if (isUserActive) {
    const syncsToRefresh = getSyncsToRefresh(sync);

    if (syncsToRefresh.length > 0) {
      return {
        action: "refresh",
        reason: "Active user + expiring soon",
        payload: syncsToRefresh,
      };
    } else {
      return {
        action: "ignore",
        reason: "Active user + not expired/expiring soon",
      };
    }
  } else {
    const result = hasAnyActiveEventSync(sync)
      ? { action: "prune", reason: "Inactive user + active sync" }
      : { action: "ignore", reason: "Inactive user + no active syncs" };
    return result;
  }
};

export const prepIncrementalImport = async (
  userId: string,
  gcal: gCalendar,
) => {
  const { gCalendarIds, calListNextSyncToken } = await getCalendarsToSync(
    userId,
    gcal,
  );

  const sync = await getSync({ userId });
  if (!sync) {
    throw error(
      SyncError.NoSyncRecordForUser,
      "Prepping for incremental import failed",
    );
  }

  const noRefreshNeeded =
    sync !== null &&
    sync.google.events.length > 0 &&
    hasAnyActiveEventSync(sync) &&
    sync.google.calendarlist.length === gCalendarIds.length;
  if (noRefreshNeeded) {
    return sync.google.events;
  }

  if (!isUsingHttps()) {
    logger.warn(
      `Skipped gcal watch during incremental import because BASEURL does not use HTTPS: '${
        ENV.BASEURL || ""
      }'`,
    );
    return sync.google.events;
  }

  await updateSyncTokenFor("calendarlist", userId, calListNextSyncToken);
  const eventWatchPayloads = assembleEventWatchPayloads(
    sync as Schema_Sync,
    gCalendarIds,
  );
  await syncService.startWatchingGcalEventsById(
    userId,
    eventWatchPayloads,
    gcal,
  );
  const newSync = (await getSync({ userId })) as Schema_Sync;

  return newSync.google.events;
};

export const pruneSync = async (toPrune: string[]) => {
  const _prunes = toPrune.map(async (u) => {
    let deletedUserData = false;
    let stopped: Result_Watch_Stop = [];
    try {
      stopped = await syncService.stopWatches(u);
    } catch (e) {
      if (isInvalidGoogleToken(e as Error)) {
        await userService.deleteCompassDataForUser(u, false);
        deletedUserData = true;
      } else {
        logger.warn("Unexpected error during prune:", e);
        throw e;
      }
    }

    const { sessionsRevoked } =
      await compassAuthService.revokeSessionsByUser(u);

    return { user: u, results: stopped, sessionsRevoked, deletedUserData };
  });

  const pruneResult = await Promise.all(_prunes);
  return pruneResult;
};

export const refreshSync = async (toRefresh: Payload_Sync_Refresh[]) => {
  const _refreshes = toRefresh.map(async (r) => {
    let revokedSession = false;
    let resynced = false;

    try {
      const gcal = await getGcalClient(r.userId);

      const refreshesByUser = r.payloads.map(async (syncPayload) => {
        const _refresh = await syncService.refreshWatch(
          r.userId,
          syncPayload,
          gcal,
        );
        return {
          gcalendarId: syncPayload.gCalendarId,
          success: _refresh.acknowledged && _refresh.modifiedCount === 1,
        };
      });

      const refreshes = await Promise.all(refreshesByUser);
      return { user: r.userId, results: refreshes, resynced, revokedSession };
    } catch (e) {
      if (isInvalidGoogleToken(e as Error)) {
        await compassAuthService.revokeSessionsByUser(r.userId);
        revokedSession = true;
      } else if (isFullSyncRequired(e as Error)) {
        await userService.reSyncGoogleData(r.userId);
        resynced = true;
      } else {
        logger.error(
          `Unexpected error during refresh for user: ${r.userId}:\n`,
          e,
        );
        throw e;
      }
      return { user: r.userId, results: [], resynced, revokedSession };
    }
  });

  const refreshes = await Promise.all(_refreshes);
  return refreshes;
};

export const watchEventsByGcalIds = async (
  userId: string,
  gCalendarIds: string[],
  gcal: gCalendar,
) => {
  const watchGcalEvents = gCalendarIds.map((gCalendarId) =>
    syncService.startWatchingGcalEvents(userId, { gCalendarId }, gcal),
  );

  const results = await Promise.all(watchGcalEvents);
  return results;
};

const updateSyncTokenIfNeededFor = async (
  resource: "events" | "calendarlist",
  userId: string,
  gCalendarId: string,
  vals: {
    prev: string;
    curr: string;
  },
) => {
  if (vals.prev !== vals.curr) {
    await updateSyncTokenFor(resource, userId, vals.curr, gCalendarId);
  }
};
