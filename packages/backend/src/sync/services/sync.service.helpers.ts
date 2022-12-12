import { gCalendar, gParamsEventsList } from "@core/types/gcal";
import { Logger } from "@core/logger/winston.logger";
import {
  Payload_Sync_Events,
  Payload_Sync_Refresh,
  Schema_Sync,
} from "@core/types/sync.types";
import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Collections } from "@backend/common/constants/collections";
import {
  error,
  GenericError,
  SyncError,
} from "@backend/common/errors/types/backend.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { yearsAgo } from "@backend/common/helpers/common.helpers";
import { EventError } from "@backend/common/errors/types/backend.errors";
import eventService from "@backend/event/services/event.service";
import mongoService from "@backend/common/services/mongo.service";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { WithId } from "mongodb";

import syncService from "./sync.service";
import {
  assembleEventOperations,
  categorizeGcalEvents,
  getActiveDeadline,
  getSummary,
  syncExpired,
  syncExpiresSoon,
} from "./sync.utils";
import {
  getSync,
  hasUpdatedCompassEventRecently,
  isWatchingEvents,
  updateSyncTimeBy,
  updateSyncTokenFor,
} from "./sync.queries";

/**
 * Helper funcs that include multiple operations (not just DB queries)
 */

const logger = Logger("app:sync.service.helpers");

export const assembleEventImports = (
  userId: string,
  gcal: gCalendar,
  eventSyncs: Schema_Sync["google"]["events"]
) => {
  const syncEvents = eventSyncs.map((eventSync) =>
    importEventsByCalendar(userId, eventSync, gcal)
  );

  return syncEvents;
};

export const deleteAllSyncData = async (userId: string) => {
  await mongoService.sync.deleteOne({ user: userId });
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

const getSyncsToRefresh = (sync: Schema_Sync) => {
  const syncsToRefresh: Payload_Sync_Events[] = [];

  sync.google.events.map((s) => {
    const expiry = s.expiration;
    if (syncExpired(expiry) || syncExpiresSoon(expiry)) {
      syncsToRefresh.push(s);
    }
  });

  return syncsToRefresh;
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

  // always fetches once, then continues until
  // there are no more events
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

  const updatedEvents = await prepEventImport(userId, gcal, syncInfo);
  if (updatedEvents.length === 0) {
    return noChanges;
  }

  const { toDelete, toUpdate } = categorizeGcalEvents(updatedEvents);
  const summary = getSummary(toUpdate, toDelete);
  logger.debug(summary);

  const ops = assembleEventOperations(userId, toDelete, toUpdate);

  if (Object.keys(ops).length === 0) {
    logger.warning("No detected changes");
    return noChanges;
  }

  const { result } = await mongoService.db
    .collection(Collections.EVENT)
    .bulkWrite(ops);

  if (result.ok) {
    await updateSyncTimeBy("gCalendarId", gCalendarId, userId);
  }

  return {
    calendar: gCalendarId,
    result: {
      updated: result.nInserted + result.nUpserted + result.nModified,
      deleted: result.nRemoved,
    },
  };
};

const prepEventImport = async (
  userId: string,
  gcal: gCalendar,
  eventSync: Payload_Sync_Events
) => {
  const { gCalendarId, nextSyncToken } = eventSync;

  const response = await gcalService.getEvents(gcal, {
    calendarId: gCalendarId,
    syncToken: nextSyncToken,
  });

  if (!response) {
    throw error(SyncError.NoEventChanges, "Import Ignored");
  }

  const { data } = response;

  if (!data.nextSyncToken) {
    logger.error("pageToken:", data.nextPageToken);
    logger.error("do sth with this:");
    logger.error(JSON.stringify(data));
    throw error(
      GenericError.NotImplemented,
      "Event Import Failed: no sync token in get event response (pagination not supported yet)"
    );
  }

  if (nextSyncToken) {
    await updateSyncTokenIfNeeded(
      nextSyncToken,
      data.nextSyncToken,
      userId,
      gCalendarId
    );
  }

  return data.items || [];
};

export const prepEventSyncChannels = async (
  userId: string,
  gcal: gCalendar
) => {
  const sync = await getSync({ userId });

  if (!sync || sync.google.events.length === 0) {
    await syncService.startWatchingGcals(userId, gcal);

    const newSync = getSync({ userId }) as unknown as Schema_Sync;

    return newSync;
  }

  return sync;
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
      const shouldRefresh = syncsToRefresh.length > 0;
      shouldRefresh
        ? toRefresh.push({ userId, payloads: syncsToRefresh })
        : ignored.push(userId);
    } else {
      const hasActiveSyncs = isWatchingEvents(sync);
      hasActiveSyncs ? toPrune.push(sync.user) : ignored.push(userId);
    }
  }

  return {
    ignored,
    toPrune,
    toRefresh,
  };
};

export const pruneSync = async (toPrune: string[]) => {
  const _prunes = toPrune.map(async (u) => {
    const _stopped = await syncService.stopWatches(u);
    const stopResult = _getStoppedSummary(_stopped);

    const { sessionsRevoked } = await compassAuthService.revokeSessionsByUser(
      u
    );

    return { user: u, stops: stopResult, sessionsRevoked };
  });

  const pruneResult = await Promise.all(_prunes);
  return pruneResult;
};

export const refreshSync = async (toRefresh: Payload_Sync_Refresh[]) => {
  const _refreshes = toRefresh.map(async (r) => {
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

    return { user: r.userId, results: refreshes };
  });

  const refreshes = await Promise.all(_refreshes);
  return refreshes;
};

export const startWatchingGcalsById = async (
  userId: string,
  gCalendarIds: string[],
  gcal: gCalendar
) => {
  const eventWatches = gCalendarIds.map((gCalId) =>
    syncService.startWatchingGcal(userId, { gCalendarId: gCalId }, gcal)
  );

  await Promise.all(eventWatches);
};

const updateSyncTokenIfNeeded = async (
  prev: string,
  curr: string,
  userId: string,
  gCalendarId: string
) => {
  if (prev !== curr) {
    await updateSyncTokenFor("events", userId, curr, gCalendarId);
  }
};

const _getStoppedSummary = (
  stopped: { channelId: string; resourceId: string }[]
) => {
  const stoppedCount = stopped.length;

  if (stoppedCount === 0) return "ignored";
  if (stoppedCount > 0) return `success (${stopped.length})`;

  return "programming error";
};
