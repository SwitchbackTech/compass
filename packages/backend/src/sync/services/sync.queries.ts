import {
  error,
  GenericError,
  SyncError,
} from "@backend/common/errors/types/backend.errors";
import mongoService from "@backend/common/services/mongo.service";
import { Origin } from "@core/constants/core.constants";
import { Schema_CalendarList } from "@core/types/calendar.types";
import { Payload_Resource_Events, Resource_Sync } from "@core/types/sync.types";

/**
 * Helper funcs that predominately query the DB
 */

export const createSync = async (
  userId: string,
  calendarList: Schema_CalendarList,
  nextSyncToken: string
) => {
  const primaryGCal = calendarList.google.items[0];
  const gCalendarId = primaryGCal!.id as string;

  const result = await mongoService.sync.insertOne({
    user: userId,
    google: {
      calendarlist: [
        {
          gCalendarId,
          nextSyncToken: nextSyncToken,
          lastSyncedAt: new Date(),
        },
      ],
      events: [],
    },
  });

  return result;
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
  resourceId?: string;
}) => {
  let filter = {};

  if (params.userId) {
    filter = { user: params.userId };
  }

  if (params.resourceId) {
    filter = { ...filter, "google.events.resourceId": params.resourceId };
  }

  const sync = await mongoService.sync.findOne(filter);

  return sync;
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
  //   data: Payload_Resource_Events | Payload_Resource_Events_TokenOptional
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
    const updateRes = await mongoService.sync.updateOne(
      { user: userId, "google.events.gCalendarId": data.gCalendarId },
      { $set: { "google.events.$": syncData } }
    );
    return updateRes;
  }

  const createRes = await mongoService.sync.updateOne(
    { user: userId },
    { $push: { "google.events": syncData } }
  );

  return createRes;
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
          "google.calendarlist.$.nextSyncToken": nextSyncToken,
          "google.calendarlist.$.lastSyncedAt": new Date(),
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
