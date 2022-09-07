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

export const getCalendarInfo = async (resourceId: string) => {
  const sync = await getSync({ resourceId });
  if (!sync) {
    throw error(SyncError.NoSyncRecordForUser, "Sync Failed");
  }

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

const checkExpiries = async (userId: string) => {
  const sync = await getSync({ userId });
  if (!sync)
    throw error(SyncError.NoSyncRecordForUser, "Sync Maintenance Failed");

  let needsRefresh = false;
  const syncsToRefresh: Payload_Sync_Events[] = [];
  sync.google.events.map((s) => {
    const expiry = s.expiration;
    if (syncExpired(expiry) || syncExpiresSoon(expiry)) {
      needsRefresh = true;
      syncsToRefresh.push(s);
    }
  });

  return { needsRefresh, syncPayloads: syncsToRefresh };
};

export const prepareMaintenance = async () => {
  const toPrune = [];
  const toRefresh = [];

  const deadline = getActiveDeadline();

  const cursor = mongoService.user.find();
  while (await cursor.hasNext()) {
    const user = await cursor.next();
    const userId = user?._id.toString() as string;
    const isActive = await hasUpdatedCompassEventRecently(userId, deadline);

    if (!isActive) {
      toPrune.push(userId);
      continue;
    }

    const { needsRefresh, syncPayloads } = await checkExpiries(userId);
    if (needsRefresh) {
      toRefresh.push({ userId, payloads: syncPayloads });
    }
  }

  return { toPrune, toRefresh };
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

  const updatedEvents = await prepareEventImport(userId, gcal, syncInfo);
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

const prepareEventImport = async (
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

export const prepareEventSyncChannels = async (
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

export const pruneSync = async (toPrune: string[]) => {
  const getStoppedSummary = (
    stopped: { channelId: string; resourceId: string }[]
  ) => {
    const stoppedCount = stopped.length;

    if (stoppedCount === 0) return "ignored";
    if (stoppedCount > 0) return `success (${stopped.length})`;

    return "programming error";
  };

  const _prunes = toPrune.map(async (u) => {
    const _stopped = await syncService.stopWatches(u);
    const stopResult = getStoppedSummary(_stopped);

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

    const userRefreshes = await Promise.all(refreshesByUser);

    return { user: r.userId, refreshes: userRefreshes };
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

/*
/--
        const resourceIdResult = await this.updateResourceId(
          reqParams.channelId,
          reqParams.resourceId
        );
        if (resourceIdResult.ok === 1) {
          result.init = `A new notification channel was successfully created for: channelId '${reqParams.channelId}' resourceId: '${reqParams.resourceId}'`;
        } else {
          result.init = {
            "Something failed while setting the resourceId:": resourceIdResult,
          };
        }

  updateResourceId = async (channelId: string, resourceId: string) => {
    // the resourceId shouldn't change frequently (or at all?),
    // so it might be safe to remove this step (after adequate confirmation)
    logger.debug(`Updating resourceId to: ${resourceId}`);
    const result = await mongoService.db
      .collection(Collections.CALENDARLIST)
      .findOneAndUpdate(
        { "google.items.sync.channelId": channelId },
        {
          $set: {
            "google.items.$.sync.resourceId": resourceId,
            updatedAt: new Date().toISOString(),
          },
        }
      );

    return result;
  };


  //-- remove
  async saveEventSyncData(
    userId: string,
    calendarId: string,
    channelId: string,
    resourceId: string
  ) {
    logger.debug("Saving watch info");
    const watchInfo = { userId, calendarId, channelId, resourceId };
    const saveRes = await mongoService.db
      .collection(Collections.WATCHLOG_GCAL)
      .insertOne(watchInfo);
    return saveRes;
  }
//old schema //--
//     const result = await mongoService.db
// .collection(Collections.CALENDARLIST)
// .findOneAndUpdate(
//   // TODO update after supporting more calendars
//   { user: userId, "google.items.primary": true },
//   {
//     $set: {
//       "google.items.$.sync.channelId": channelId,
//       "google.items.$.sync.resourceId": resourceId,
//       "google.items.$.sync.expiration": expiration,
//     },
//   }
// );

export const OLDprepareUpdate = async (
  gcal: gCalendar,
  params: Params_Sync_Gcal
): Promise<Result_Sync_Prep_Gcal> => {
  const prepResult = {
    syncToken: undefined,
    operations: undefined,
    errors: [],
  };

  try {
    // TODO: support pageToken in case a lot of new events changed since last sync

    const { calendarId, nextSyncToken, userId } = params;

    const updatedEvents = await gcalService.getEvents(gcal, {
      calendarId: calendarId,
      syncToken: nextSyncToken,
    });

    // Save the updated sync token for next time
    const syncTokenUpdateResult = await this.updateNextSyncToken(
      params.userId,
      updatedEvents.data.nextSyncToken
    );
    prepResult.syncToken = syncTokenUpdateResult;

    // Update Compass' DB
    const { eventsToDelete, eventsToUpdate } = categorizeGcalEvents(
      updatedEvents.data.items
    );

    const summary = getSummary(eventsToUpdate, eventsToDelete);
    logger.debug(summary);

    prepResult.operations = assembleBulkOperations(
      userId,
      eventsToDelete,
      eventsToUpdate
    );

    return prepResult;
  } catch (e) {
    logger.error(`Errow while sycning\n`, e);
    syncFileLogger.error(`Errow while sycning\n`, e);
    const err = new BaseError(
      "Sync Update Failed",
      e,
      Status.INTERNAL_SERVER,
      true
    );

    prepResult.errors.push(err);
    return prepResult;
  }
};

export const OLDprepareSyncChannels = async (reqParams: Payload_Sync_Notif) => {
  const channelPrepResult = {
    stop: undefined,
    refresh: undefined,
    stillActive: undefined,
  };

  // initialize what you'll need later
  const calendarList = (await mongoService.db
    .collection(Collections.CALENDARLIST)
    .findOne({
      "google.items.sync.resourceId": reqParams.resourceId,
    })) as Schema_CalendarList;

  const userId = calendarList.user;

  const cal = findCalendarByResourceId(reqParams.resourceId, calendarList);
  const nextSyncToken = cal.sync.nextSyncToken;

  const gcal = await getGcalClient(userId);

  const refreshNeeded = channelRefreshNeeded(
    calendarList,
    reqParams.channelId,
    reqParams.expiration
  );
  if (refreshNeeded) {
    console.log("\n**** (this used to be when you refreshed channel) ***\n");
    //--++
    // channelPrepResult.refresh = await this.refreshChannelWatch(
    //   userId,
    //   gcal,
    //   reqParams
    // );
  } else {
    channelPrepResult.stillActive = true;
  }

  return { channelPrepResult, userId, gcal, nextSyncToken };
};

*/
