import { ClientSession, UpdateFilter, UpdateResult } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import { Schema_CalendarList } from "@core/types/calendar.types";
import {
  Payload_Sync_Events,
  Resource_Sync,
  Schema_Sync,
} from "@core/types/sync.types";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { getPrimaryGcalId } from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";

/**
 * Helper funcs that predominately query/update the DB
 */

export const createSync = async (
  userId: string,
  data: {
    calendarlist: Omit<
      Schema_Sync["google"]["calendarlist"][0],
      "lastSyncedAt"
    >[];
    events: Payload_Sync_Events[];
  },
  session?: ClientSession,
) => {
  const result = await mongoService.sync.insertOne(
    {
      user: userId,
      google: {
        ...data,
        calendarlist: data.calendarlist.map((c) => ({
          ...c,
          lastSyncedAt: new Date(),
        })),
        events: data.events.map((e) => ({
          ...e,
          lastSyncedAt: new Date(),
        })),
      },
    },
    { session },
  );

  return result;
};

export const reInitSyncByIntegration = async (
  integration: "google",
  userId: string,
  calendarList: Schema_CalendarList,
  calListSyncToken: string,
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
    },
  );

  return result;
};

export const deleteAllSyncData = async (userId: string) => {
  await mongoService.sync.deleteOne({ user: userId });
};

export const deleteWatchData = async (
  userId: string,
  resource: Resource_Sync,
  channelId: string,
) => {
  return await mongoService.sync.updateOne(
    { user: userId, [`google.${resource}.channelId`]: channelId },
    {
      $unset: {
        [`google.${resource}.$.channelId`]: "",
        [`google.${resource}.$.expiration`]: "",
      },
    },
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

export const getGCalEventsSyncPageToken = async (
  userId: string,
  gCalendarId: string,
  session?: ClientSession,
): Promise<string | undefined | null> => {
  const response = await mongoService.sync.findOne(
    { user: userId, "google.events.gCalendarId": gCalendarId },
    { session },
  );

  return response?.google.events.find((e) => e.gCalendarId === gCalendarId)
    ?.nextPageToken;
};

export const hasUpdatedCompassEventRecently = async (
  userId: string,
  deadline: string,
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
  gCalendarId: string,
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

export const updateSync = async (
  resource: Exclude<Resource_Sync, "settings">,
  userId: string,
  gCalendarId: string,
  update: Partial<
    Omit<Payload_Sync_Events, "gCalendarId" | "lastSyncedAt">
  > = {},
  session?: ClientSession,
): Promise<UpdateResult<Schema_Sync>> => {
  const sync = await getSync({ userId });

  const data = sync?.google[resource];
  const index = data?.findIndex((e) => e.gCalendarId === gCalendarId) ?? -1;
  const operation: UpdateFilter<Schema_Sync> = {};

  if (index === -1) {
    operation.$push = {
      [`google.${resource}`]: {
        ...update,
        gCalendarId,
        lastSyncedAt: new Date(),
      },
    };
  } else {
    operation.$set = {
      [`google.${resource}.${index}.gCalendarId`]: gCalendarId,
      ...Object.entries(update).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [`google.${resource}.${index}.${key}`]: value,
        }),
        {},
      ),
      [`google.${resource}.${index}.lastSyncedAt`]: new Date(),
    };
  }

  const response = await mongoService.sync.updateOne(
    { user: userId },
    operation,
    { session, upsert: true },
  );

  return response;
};
