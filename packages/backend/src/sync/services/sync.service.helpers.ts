import { WithId } from "mongodb";
import {
  gCalendar,
  gSchema$CalendarList,
  gParamsEventsList,
} from "@core/types/gcal";
import { Logger } from "@core/logger/winston.logger";
import {
  Payload_Sync_Events,
  Payload_Sync_Refresh,
  Result_Watch_Stop,
  Schema_Sync,
} from "@core/types/sync.types";
import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { Schema_CalendarList } from "@core/types/calendar.types";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Collections } from "@backend/common/constants/collections";
import { yearsAgo } from "@backend/common/helpers/common.util";
import { EventError } from "@backend/common/constants/error.constants";
import {
  GenericError,
  GcalError,
  SyncError,
} from "@backend/common/constants/error.constants";
import { ENV } from "@backend/common/constants/env.constants";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import {
  isFullSyncRequired,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import eventService from "@backend/event/services/event.service";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import userService from "@backend/user/services/user.service";

import syncService from "./sync.service";
import {
  assembleEventOperations,
  categorizeGcalEvents,
  getActiveDeadline,
  getSummary,
  isUsingHttps,
  syncExpired,
  syncExpiresSoon,
} from "../util/sync.utils";
import {
  createSync,
  getSync,
  hasUpdatedCompassEventRecently,
  updateSyncTimeBy,
  updateSyncTokenFor,
} from "../util/sync.queries";

/**
 * Helper funcs that include multiple operations (not just DB queries)
 */

const logger = Logger("app:sync.service.helpers");

export const assembleEventImports = (
  userId: string,
  gcal: gCalendar,
  eventSyncPayloads: Schema_Sync["google"]["events"]
) => {
  const syncEvents = eventSyncPayloads.map((eventSync) =>
    importEventsByCalendar(userId, eventSync, gcal)
  );

  return syncEvents;
};

const assembleEventWatchPayloads = (
  sync: Schema_Sync,
  gCalendarIds: string[]
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
  resourceId: string
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
    (gcal) => gcal.id
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
  syncToken: string | null | undefined
) => {
  if (pageToken !== undefined && pageToken !== null) {
    return pageToken;
  }

  if (syncToken === undefined || syncToken === null) {
    throw error(
      GenericError.DeveloperError,
      "Failed to get correct sync token"
    );
  }

  return syncToken;
};

const getUpdatedEvents = async (
  gcal: gCalendar,
  gCalendarId: string,
  syncToken: string
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

export const importEvents = async (
  userId: string,
  gcal: gCalendar,
  calendarId: string
) => {
  let nextPageToken: string | undefined = undefined;
  let nextSyncToken: string | null | undefined = undefined;
  let total = 0;

  const numYears = 1;
  const xYearsAgo = yearsAgo(numYears);

  do {
    const params: gParamsEventsList = {
      calendarId,
      timeMin: xYearsAgo.toISOString(),
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
        Origin.GOOGLE_IMPORT
      );
      await eventService.createMany(cEvents);
    }

    nextPageToken = gEvents.data.nextPageToken as string;
    nextSyncToken = gEvents.data.nextSyncToken;
  } while (nextPageToken !== undefined);

  const summary = {
    total: total,
    nextSyncToken: nextSyncToken as string,
  };
  return summary;
};

export const importEventsByCalendar = async (
  userId: string,
  syncInfo: Payload_Sync_Events,
  gcal?: gCalendar
) => {
  if (!gcal) gcal = await getGcalClient(userId);
  const { gCalendarId } = syncInfo;

  const noChanges = {
    calendar: gCalendarId,
    result: {
      updated: 0,
      deleted: 0,
    },
  };

  let nextSyncToken: string | null | undefined = syncInfo.nextSyncToken;
  let nextPageToken: string | null | undefined = undefined;
  let deleted = 0;
  let updated = 0;

  do {
    const syncToken = getSyncToken(nextPageToken, nextSyncToken);

    const response = await getUpdatedEvents(gcal, gCalendarId, syncToken);
    const updatedEvents = response.items || [];

    if (updatedEvents.length === 0) {
      return noChanges;
    }

    const { toDelete, toUpdate } = categorizeGcalEvents(updatedEvents);
    const summary = getSummary(toUpdate, toDelete, syncInfo.resourceId);
    logger.debug(summary);

    const ops = assembleEventOperations(userId, toDelete, toUpdate);

    if (Object.keys(ops).length === 0) {
      logger.warning("No detected changes");
      return noChanges;
    }

    const result = await mongoService.db
      .collection(Collections.EVENT)
      .bulkWrite(ops);

    if (!result.ok) {
      throw error(
        GenericError.NotSure,
        "Events not updated after notification"
      );
    }

    updated +=
      result.insertedCount + result.upsertedCount + result.modifiedCount;
    deleted += result.deletedCount;

    nextSyncToken = response.nextSyncToken;
    nextPageToken = response.nextPageToken;
  } while (nextPageToken !== undefined);

  await updateSyncTimeBy("gCalendarId", gCalendarId, userId);
  await updateSyncTokenIfNeededFor("events", userId, gCalendarId, {
    prev: syncInfo.nextSyncToken as string,
    curr: nextSyncToken as string,
  });

  return {
    calendar: gCalendarId,
    result: {
      updated,
      deleted,
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
      `Skipped gcal watch during sync init because BASEURL does not use HTTPS: '${ENV.BASEURL}'`
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
      hasAnyActiveEventSync(sync)
        ? toPrune.push(sync.user)
        : ignored.push(userId);
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
  gcal: gCalendar
) => {
  const { gCalendarIds, calListNextSyncToken } = await getCalendarsToSync(
    userId,
    gcal
  );

  const sync = await getSync({ userId });
  if (!sync) {
    throw error(
      SyncError.NoSyncRecordForUser,
      "Prepping for incremental import failed"
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
      }'`
    );
    return sync.google.events;
  }

  await updateSyncTokenFor("calendarlist", userId, calListNextSyncToken);
  const eventWatchPayloads = assembleEventWatchPayloads(
    sync as Schema_Sync,
    gCalendarIds
  );
  await syncService.startWatchingGcalEventsById(
    userId,
    eventWatchPayloads,
    gcal
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

    const { sessionsRevoked } = await compassAuthService.revokeSessionsByUser(
      u
    );

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
          gcal
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
          e
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
  gcal: gCalendar
) => {
  const watchGcalEvents = gCalendarIds.map((gCalendarId) =>
    syncService.startWatchingGcalEvents(userId, { gCalendarId }, gcal)
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
  }
) => {
  if (vals.prev !== vals.curr) {
    await updateSyncTokenFor(resource, userId, vals.curr, gCalendarId);
  }
};
