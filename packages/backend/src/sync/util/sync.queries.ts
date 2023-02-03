import { Origin } from "@core/constants/core.constants";
import { Schema_CalendarList } from "@core/types/calendar.types";
import { Payload_Resource_Events, Resource_Sync } from "@core/types/sync.types";
import {
  GenericError,
  SyncError,
} from "@backend/common/constants/error.constants";
import mongoService from "@backend/common/services/mongo.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import { getPrimaryGcalId } from "@backend/common/services/gcal/gcal.utils";

/**
 * Helper funcs that predominately query/update the DB
 */

export const createSync = async (
  userId: string,
  calendarList: Schema_CalendarList,
  nextSyncToken: string
) => {
  const gCalendarId = getPrimaryGcalId(calendarList);

  const result = await mongoService.sync.insertOne({
    user: userId,
    google: {
      calendarlist: [
        {
          gCalendarId,
          nextSyncToken,
          lastSyncedAt: new Date(),
        },
      ],
      events: [],
    },
  });

  return result;
};

export const reInitSyncByIntegration = async (
  integration: "google",
  userId: string,
  calendarList: Schema_CalendarList,
  calListSyncToken: string
) => {
  const gCalendarId = getPrimaryGcalId(calendarList);

  const result = await mongoService.sync.updateOne(
    {
      user: userId,
    },
    {
      $set: {
        [integration]: {
          calendarlist: [
            {
              gCalendarId,
              nextSyncToken: calListSyncToken,
              lastSyncedAt: new Date(),
            },
          ],
          events: [],
        },
      },
    }
  );

  return result;
};

export const deleteAllSyncData = async (userId: string) => {
  await mongoService.sync.deleteOne({ user: userId });
};

export const deleteWatchData = async (
  userId: string,
  resource: Resource_Sync,
  channelId: string
) => {
  return await mongoService.sync.updateOne(
    { user: userId, [`google.${resource}.channelId`]: channelId },
    {
      $unset: {
        [`google.${resource}.$.channelId`]: "",
        [`google.${resource}.$.expiration`]: "",
      },
    }
  );
};

export const getSync = async (params: {
  userId?: string;
  gCalendarId?: string;
  resourceId?: string;
}) => {
  let filter = {};

  if (params.userId) {
    filter = { user: params.userId };
  }

  if (params.gCalendarId) {
    filter = { ...filter, "google.events.gCalendarId": params.gCalendarId };
  }

  if (params.resourceId) {
    filter = { ...filter, "google.events.resourceId": params.resourceId };
  }

  if (Object.keys(filter).length === 0) {
    // prevents Mongo from returning the first
    // sync record in the DB and Compass
    // operating on the wrong user's sync
    error(GenericError.DeveloperError, "Sync record could not be retrieved");
  }

  const sync = await mongoService.sync.findOne(filter);

  return sync;
};

export const getSyncByToken = async (syncToken: string) => {
  const resources = ["calendarlist", "events"];

  for (const r of resources) {
    const match = await mongoService.sync.findOne({
      [`google.${r}.nextSyncToken`]: syncToken,
    });

    if (match) {
      return match;
    }
  }

  return null;
};

export const hasUpdatedCompassEventRecently = async (
  userId: string,
  deadline: string
) => {
  const recentChanges = await mongoService.event.countDocuments({
    user: userId,
    origin: Origin.COMPASS,
    updatedAt: { $gt: new Date(deadline) },
  });

  return recentChanges > 0;
};

export const isWatchingEventsByGcalId = async (
  userId: string,
  gCalendarId: string
) => {
  const sync = await mongoService.sync.countDocuments({
    user: userId,
    "google.events.gCalendarId": gCalendarId,
    "google.events.$.channelId": { $exists: true },
    "google.events.$.expiration": { $exists: true },
  });

  const hasSyncFields = sync === 1;

  return hasSyncFields;
};

export const updateSyncFor = async (
  resource: Resource_Sync,
  userId: string,
  data: Payload_Resource_Events
) => {
  if (resource !== "events") {
    throw error(GenericError.NotImplemented, "Sync Update Failed");
  }

  const _syncData = {
    gCalendarId: data.gCalendarId,
    resourceId: data.resourceId,
    lastSyncedAt: new Date(),
    channelId: data.channelId,
    expiration: data.expiration,
  };

  const syncData = data.nextSyncToken
    ? { ..._syncData, nextSyncToken: data.nextSyncToken }
    : _syncData;

  const matches = await mongoService.sync.countDocuments({
    user: userId,
    "google.events.gCalendarId": data.gCalendarId,
  });
  const syncExists = matches === 1;

  if (syncExists) {
    const updateResult = await mongoService.sync.updateOne(
      { user: userId, "google.events.gCalendarId": data.gCalendarId },
      { $set: { "google.events.$": syncData } }
    );
    return updateResult;
  }

  const createResult = await mongoService.sync.updateOne(
    { user: userId },
    { $push: { "google.events": syncData } }
  );

  return createResult;
};

export const updateRefreshedAtFor = async (
  resource: Resource_Sync,
  userId: string,
  gCalendarId: string
) => {
  if (resource !== "events") {
    throw error(GenericError.NotImplemented, "Update RefreshedAt Failed");
  }

  const result = await mongoService.sync.updateOne(
    { user: userId, "google.events.gCalendarId": gCalendarId },
    { $set: { "google.events.$.lastRefreshedAt": new Date() } }
  );
  return result;
};

export const updateSyncTimeBy = async (
  key: "gCalendarId",
  value: string,
  userId: string
) => {
  const result = await mongoService.sync.updateOne(
    { user: userId, [`google.events.${key}`]: value },
    { $set: { "google.events.$.lastSyncedAt": new Date() } }
  );
  return result;
};

export const updateSyncTokenFor = async (
  resource: "calendarlist" | "events",
  userId: string,
  nextSyncToken: string,
  gCalendarId?: string
) => {
  if (resource === "calendarlist") {
    const result = await mongoService.sync.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $set: {
          "google.calendarlist.0.nextSyncToken": nextSyncToken,
          "google.calendarlist.0.lastSyncedAt": new Date(),
        },
      },
      { returnDocument: "after", upsert: true }
    );

    return result;
  } else {
    if (!gCalendarId) {
      throw error(SyncError.NoGCalendarId, "Update Sync Token Failed");
    }

    const response = await mongoService.sync.findOneAndUpdate(
      { user: userId, "google.events.gCalendarId": gCalendarId },
      {
        $set: {
          "google.events.$.nextSyncToken": nextSyncToken,
          "google.events.$.lastSyncedAt": new Date(),
        },
      },
      { upsert: true }
    );

    return response;
  }
};
