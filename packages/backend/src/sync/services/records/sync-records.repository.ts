import {
  type ClientSession,
  type UpdateFilter,
  type UpdateResult,
} from "mongodb";
import zod from "zod";
import {
  Resource_Sync,
  type Schema_Sync,
  type SyncDetails,
} from "@core/types/sync.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export const resourceValidationSchema = zod
  .enum([Resource_Sync.EVENTS, Resource_Sync.CALENDAR])
  .default(Resource_Sync.EVENTS);

export const syncFilterValidationSchema = zod
  .object({
    userId: zod.string(),
    resource: resourceValidationSchema,
    gCalendarId: zod.string().optional(),
  })
  .transform(({ userId, resource, gCalendarId }) => ({
    user: userId,
    ...(gCalendarId ? { [`google.${resource}.gCalendarId`]: gCalendarId } : {}),
  }));

export const channelFilterValidationSchema = zod
  .object({
    resource: resourceValidationSchema,
    gCalendarId: zod.string().optional(),
  })
  .transform(({ resource, gCalendarId }) => ({
    ...(gCalendarId ? { [`google.${resource}.gCalendarId`]: gCalendarId } : {}),
  }));

export const getSyncParamsValidationSchema = zod.union([
  syncFilterValidationSchema,
  channelFilterValidationSchema,
]);

export const getSync = async (
  params:
    | { userId: string }
    | {
        userId: string;
        gCalendarId: string;
        resource?: Exclude<Resource_Sync, Resource_Sync.SETTINGS>;
      },
) => {
  const filter = getSyncParamsValidationSchema.parse(params);
  const sync = await mongoService.sync.findOne(filter);

  return sync;
};

export const getSyncByToken = async (syncToken: string) => {
  const resources = [Resource_Sync.CALENDAR, Resource_Sync.EVENTS];

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

  return response?.google?.events?.find((e) => e.gCalendarId === gCalendarId)
    ?.nextPageToken;
};

export const canDoIncrementalSync = (sync: Schema_Sync) => {
  const events = sync.google?.events;

  if (!events || events.length === 0) {
    return false;
  }

  return events.every((event) => event.nextSyncToken !== null);
};

export const updateSync = async (
  resource: Exclude<Resource_Sync, "settings">,
  userId: string,
  gCalendarId: string,
  update: Partial<Omit<SyncDetails, "gCalendarId" | "lastSyncedAt">> = {},
  session?: ClientSession,
): Promise<UpdateResult<Schema_Sync>> => {
  const sync = await getSync({ userId });

  const data = sync?.google?.[resource];
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
    const fieldUpdates = Object.fromEntries(
      Object.entries(update).map(([key, value]) => [
        `google.${resource}.${index}.${key}`,
        value,
      ]),
    );

    operation.$set = {
      [`google.${resource}.${index}.gCalendarId`]: gCalendarId,
      ...fieldUpdates,
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

export const deleteAllByGcalId = (
  gCalendarId: string,
  session?: ClientSession,
) => {
  return mongoService.sync.deleteMany(
    { "google.events.gCalendarId": gCalendarId },
    { session },
  );
};

/**
 * Removes a single resource's sync entry (by gCalendarId) from the user's
 * sync document, leaving the rest of the document - the calendarlist token
 * and every other calendar's entries - untouched. Unlike `deleteAllByGcalId`
 * (which deletes the whole sync document), this only ever touches one array
 * entry.
 */
export const removeSyncEntry = (
  resource: Exclude<Resource_Sync, Resource_Sync.SETTINGS>,
  userId: string,
  gCalendarId: string,
  session?: ClientSession,
): Promise<UpdateResult<Schema_Sync>> => {
  const operation: UpdateFilter<Schema_Sync> = {
    $pull: { [`google.${resource}`]: { gCalendarId } },
  };

  return mongoService.sync.updateOne({ user: userId }, operation, {
    session,
  });
};

export const deleteAllByUser = (userId: string, session?: ClientSession) => {
  return mongoService.sync.deleteMany({ user: userId }, { session });
};

export const deleteByIntegration = (integration: "google", userId: string) => {
  return mongoService.db
    .collection(Collections.SYNC)
    .updateOne({ user: userId }, { $unset: { [integration]: "" } });
};

const syncRecords = {
  canDoIncrementalSync,
  deleteAllByGcalId,
  deleteAllByUser,
  deleteByIntegration,
  getGCalEventsSyncPageToken,
  getSync,
  getSyncByToken,
  removeSyncEntry,
  updateSync,
};

export default syncRecords;
