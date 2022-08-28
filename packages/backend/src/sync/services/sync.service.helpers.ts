import { gCalendar, gParamsEventsList } from "@core/types/gcal";
import { Logger } from "@core/logger/winston.logger";
import {
  Payload_Sync_Events,
  Schema_Sync,
  Resource_Sync,
  Payload_Resource_Events,
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

import syncService from "./sync.service";
import {
  assembleEventOperations,
  categorizeGcalEvents,
  channelExpiresSoon,
  getSummary,
} from "./sync.utils";

/**
 * Helper funcs that depend on services
 * (and thus shouldn't be separated into
 * utils file, because they'll make
 * testing more difficult)
 *
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

export const getCalendarInfo = async (resourceId: string) => {
  const sync = await getSync({ resourceId });
  if (!sync) {
    throw error(SyncError.NoSyncRecordForUser, "Sync Failed");
  }

  const matches = sync.google.events.filter((g) => {
    return g.resourceId === resourceId;
  });

  const gCalendarId = matches[0]?.gCalendarId as string;
  const nextSyncToken = matches[0]?.nextSyncToken as string;
  return {
    userId: sync.user,
    gCalendarId,
    nextSyncToken,
  };
};

export const deleteAllSyncData = async (userId: string) => {
  await mongoService.db
    .collection(Collections.SYNC)
    .deleteOne({ user: userId });
};

export const deleteSync = async (
  userId: string,
  resource: Resource_Sync,
  channelId: string
) => {
  await mongoService.db.collection(Collections.SYNC).updateOne(
    { user: userId },
    {
      $pull: {
        [`google.${resource}`]: { channelId: channelId },
      },
    }
  );
};

export const getSync = async (params: {
  userId?: string;
  resourceId?: string;
}) => {
  let filter = {};
  if (params.userId) {
    filter = { user: params.userId };
  }
  if (params.resourceId) {
    filter = { ...filter, "google.events.resourceId": params.resourceId };
  }

  const sync = (await mongoService.db
    .collection(Collections.SYNC)
    .findOne(filter)) as Schema_Sync | null;

  return sync;
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

    total += gEvents.data.items.length;

    const cEvents = MapEvent.toCompass(
      userId,
      gEvents.data.items,
      Origin.GOOGLE_IMPORT
    );

    await eventService.createMany(userId, cEvents);
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

export const isWatchingEvents = async (userId: string, gCalendarId: string) => {
  const matchingWatch = (await mongoService.db
    .collection(Collections.SYNC)
    .findOne({
      user: userId,
      "google.events.gCalendarId": gCalendarId,
    })) as Schema_Sync | null;

  return matchingWatch !== null;
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
    throw error(
      GenericError.NotImplemented,
      "Event Import Failed - no sync token + pagination not supported yet"
    );
  }

  await updateSyncTokenIfNeeded(
    nextSyncToken,
    data.nextSyncToken,
    userId,
    gCalendarId
  );

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

  const refreshes = sync.google.events.map(async (es) => {
    if (channelExpiresSoon(es.expiration)) {
      await syncService.refreshWatch(userId, gcal, es);
    }
  });
  await Promise.all(refreshes);

  return sync;
};

export const startWatchingGcalsById = async (
  userId: string,
  gCalendarIds: string[],
  gcal: gCalendar
) => {
  const eventWatches = gCalendarIds.map((gCalId) =>
    syncService.startWatchingGcal(userId, gCalId, gcal)
  );

  await Promise.all(eventWatches);
};

export const updateSyncDataFor = async (
  resource: Resource_Sync,
  userId: string,
  data: Payload_Resource_Events
) => {
  if (resource !== "events") {
    throw error(GenericError.NotImplemented, "Sync Update Failed");
  }

  await mongoService.db.collection(Collections.SYNC).updateOne(
    { user: userId },
    {
      $push: {
        "google.events": {
          gCalendarId: data.gCalendarId,
          channelId: data.channelId,
          expiration: data.expiration,
          resourceId: data.resourceId,
          lastSyncedAt: new Date(),
        },
      },
    },
    { upsert: true }
  );

  const updatedSync = (await mongoService.db
    .collection(Collections.SYNC)
    .findOne({ user: userId })) as Schema_Sync | null;
  if (!updatedSync) {
    throw error(SyncError.NoSyncRecordForUser, "Failed to Update Sync Data");
  }

  return updatedSync;
};

export const updateSyncTokenFor = async (
  resource: "calendarlist",
  userId: string,
  nextSyncToken: string
) => {
  const result = await mongoService.db
    .collection(Collections.SYNC)
    .findOneAndUpdate(
      {
        user: userId,
      },
      {
        //@ts-ignore
        $set: {
          [`google.${resource}.nextSyncToken`]: nextSyncToken,
          [`google.${resource}.lastSyncedAt`]: new Date(),
        },
      },
      { returnDocument: "after", upsert: true }
    );

  return result;
};

export const updateSyncTokenForGcal = async (
  userId: string,
  gCalendarId: string,
  nextSyncToken: string
) => {
  const payload = {
    "google.events.$.nextSyncToken": nextSyncToken,
    "google.events.$.lastSyncedAt": new Date(),
  };

  const response = await mongoService.db
    .collection(Collections.SYNC)
    .findOneAndUpdate(
      { user: userId, "google.events.gCalendarId": gCalendarId },
      {
        //@ts-ignore
        $set: payload,
      },
      { upsert: true }
    );

  return response;
};

const updateSyncTokenIfNeeded = async (
  prev: string,
  curr: string,
  userId: string,
  gCalendarId: string
) => {
  if (prev !== curr) {
    await updateSyncTokenForGcal(userId, gCalendarId, curr);
  }
};

export const updateRefreshedAt = async (
  userId: string,
  gCalendarId: string
) => {
  const result = await mongoService.db
    .collection(Collections.SYNC)
    .updateOne(
      { user: userId, "google.events.gCalendarId": gCalendarId },
      { $set: { "google.events.$.lastRefreshedAt": new Date() } }
    );
  return result;
};

const updateSyncTimeBy = async (
  key: "gCalendarId",
  value: string,
  userId: string
) => {
  const result = await mongoService.db
    .collection(Collections.SYNC)
    .updateOne(
      { user: userId, [`google.events.${key}`]: value },
      { $set: { "google.events.$.lastSyncedAt": new Date() } }
    );
  return result;
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
