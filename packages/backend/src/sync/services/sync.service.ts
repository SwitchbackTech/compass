import { type ClientSession, type Filter, ObjectId } from "mongodb";
import { RESULT_NOTIFIED_CLIENT } from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
import {
  type Schema_Event,
  type Schema_Event_Core,
} from "@core/types/event.types";
import { type gCalendar } from "@core/types/gcal";
import {
  type Params_WatchEvents,
  type Payload_Sync_Notif,
  Resource_Sync,
  type Result_Watch_Stop,
  XGoogleResourceState,
} from "@core/types/sync.types";
import { ExpirationDateSchema } from "@core/types/type.utils";
import { WatchSchema } from "@core/types/watch.types";
import {
  shouldDoIncrementalGCalSync,
  shouldImportGCal,
} from "@core/util/event/event.util";
import { getGcalClient } from "@backend/auth/services/google/clients/google.calendar.client";
import calendarService from "@backend/calendar/services/calendar.service";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import { Collections } from "@backend/common/constants/collections";
import { error } from "@backend/common/errors/handlers/error.handler";
import { getGoogleRepairErrorMessage } from "@backend/common/errors/integration/gcal/gcal.errors";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import { UserError } from "@backend/common/errors/user/user.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import {
  getGoogleErrorStatus,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { _createGcal } from "@backend/event/services/event.service";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { createSyncImport } from "@backend/sync/services/import/sync.import";
import {
  prepWatchMaintenanceForUser,
  pruneSync,
  refreshWatch,
} from "@backend/sync/services/maintain/sync.maintenance";
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";
import {
  getSync,
  isWatchingGoogleResource,
  updateSync,
} from "@backend/sync/util/sync.queries";
import {
  getChannelExpiration,
  isMissingGoogleRefreshToken,
  isUsingHttps,
} from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import userMetadataService from "@backend/user/services/user-metadata.service";

const logger = Logger("app:sync.service");

class SyncService {
  deleteAllByGcalId = async (gCalendarId: string, session?: ClientSession) => {
    const delRes = await mongoService.sync.deleteMany(
      { "google.events.gCalendarId": gCalendarId },
      { session },
    );

    return delRes;
  };

  deleteAllByUser = async (userId: string, session?: ClientSession) => {
    const delRes = await mongoService.sync.deleteMany(
      { user: userId },
      { session },
    );

    return delRes;
  };

  deleteByIntegration = async (integration: "google", userId: string) => {
    const response = await mongoService.db
      .collection(Collections.SYNC)
      .updateOne({ user: userId }, { $unset: { [integration]: "" } });

    return response;
  };

  deleteWatchesByUser = async (
    user: string,
    session?: ClientSession,
  ): Promise<Result_Watch_Stop> => {
    const watches = await mongoService.watch
      .find({ user }, { session })
      .toArray();

    await mongoService.watch.deleteMany({ user }, { session });

    return watches.map(({ _id, resourceId }) => ({
      channelId: _id.toString(),
      resourceId,
    }));
  };

  private prepareStopWatches = async (
    user: string,
    gcal?: gCalendar,
    session?: ClientSession,
  ) => {
    const watches = await mongoService.watch
      .find({ user }, { session })
      .toArray();

    if (watches.length === 0 || gcal) {
      return { watches, gcal };
    }

    const compassUser = await findCompassUserBy("_id", user);

    if (!compassUser) {
      throw error(UserError.UserNotFound, "User not found");
    }

    if (!compassUser.google?.gRefreshToken) {
      await mongoService.watch.deleteMany({ user }, { session });

      logger.warn(
        "Google refresh token is missing. Corresponding watch records deleted",
      );

      return { watches: [], gcal };
    }

    return {
      watches,
      gcal: await getGcalClient(user),
    };
  };

  async cleanupStaleWatchChannel({
    channelId,
    resourceId,
  }: Payload_Sync_Notif): Promise<boolean> {
    const channel = await mongoService.watch.findOne({
      _id: channelId,
      resourceId,
    });

    if (!channel) {
      logger.warn(
        `Ignoring stale Google notification because no exact watch exists for channelId: ${channelId.toString()}, resourceId: ${resourceId}`,
      );

      return false;
    }

    try {
      await this.stopWatch(
        channel.user,
        channel._id.toString(),
        channel.resourceId,
      );

      logger.warn(
        `Cleaned up stale watch for user: ${channel.user} with channelId: ${channel._id.toString()} with resourceId: ${channel.resourceId}`,
      );

      return true;
    } catch (error) {
      logger.error(
        `Failed to clean up stale watch for user: ${channel.user} with channelId: ${channel._id.toString()}`,
        error,
      );

      return false;
    }
  }

  handleGcalNotification = async (payload: Payload_Sync_Notif) => {
    const { channelId, resourceId, resourceState, resource } = payload;
    const { expiration } = payload;

    if (resourceState === XGoogleResourceState.SYNC) {
      logger.info(
        `${resource} sync initialized for channelId: ${payload.channelId.toString()}`,
      );

      return "INITIALIZED";
    }

    const watch = await mongoService.watch.findOne({
      _id: channelId,
      resourceId,
      expiration: { $gte: expiration },
    });

    if (!watch) {
      // clean up stale watch channel;
      const cleanedUp = await this.cleanupStaleWatchChannel(payload);

      if (cleanedUp) return "IGNORED";

      logger.warn(
        `Ignoring notification because no active watch record exists for channel: ${payload.channelId.toString()}`,
      );

      return "IGNORED";
    }

    const sync = await getSync({ userId: watch.user, resource });

    if (!sync) {
      // clean up stale watch channel;
      const cleanedUp = await this.cleanupStaleWatchChannel(payload);

      if (cleanedUp) return "IGNORED";

      logger.warn(
        `Ignoring notification because no sync record exists for channel: ${payload.channelId.toString()}`,
      );

      return "IGNORED";
    }

    const userId = sync.user;
    const { events = [], calendarlist = [] } = sync.google ?? {};
    const channels = [...events, ...calendarlist];
    const channel = channels.find((e) => e.gCalendarId === watch.gCalendarId);
    const calendarId = channel?.gCalendarId;
    const nextSyncToken = channel?.nextSyncToken;

    if (!nextSyncToken) {
      throw error(
        SyncError.NoSyncToken,
        `Notification not handled because no sync token found for calendarId: ${calendarId}`,
      );
    }

    // Get the Google Calendar client
    const gcal = await getGcalClient(userId);

    // Create and use the notification handler
    const handler = new GCalNotificationHandler(
      gcal,
      resource,
      userId,
      watch.gCalendarId,
      nextSyncToken,
    );

    await handler.handleNotification();

    const wsResult = webSocketServer.handleBackgroundCalendarChange(userId);

    const result = wsResult?.includes(RESULT_NOTIFIED_CLIENT)
      ? "PROCESSED AND NOTIFIED CLIENT"
      : "PROCESSED IN BACKGROUND";

    logger.info(
      `GCal Notification for user: ${userId}, calendarId: ${calendarId} ${result}`,
    );

    return result;
  };

  importFull = async (
    gcal: gCalendar,
    gCalendarIds: string[],
    userId: string,
  ) => {
    const session = await mongoService.startSession({
      causalConsistency: true,
    });

    session.startTransaction();

    try {
      const syncImport = await createSyncImport(gcal);

      const eventImports = await Promise.all(
        gCalendarIds.map(async (gCalId) => {
          const { nextSyncToken, ...result } = await syncImport.importAllEvents(
            userId,
            gCalId,
            2500,
          );

          await updateSync(
            Resource_Sync.EVENTS,
            userId,
            gCalId,
            { nextSyncToken },
            session,
          );

          return { gCalId, ...result };
        }),
      );

      await session.commitTransaction();

      return eventImports;
    } catch (error: unknown) {
      await session.abortTransaction();

      throw error;
    }
  };

  importIncremental = async (
    userId: string,
    gcal?: gCalendar,
    perPage = 1000,
  ) => {
    logger.info(
      `Starting incremental Google Calendar sync for user: ${userId}`,
    );

    try {
      webSocketServer.handleImportGCalStart(userId);

      const userMeta = await userMetadataService.fetchUserMetadata(
        userId,
        undefined,
        {
          skipAssessment: true,
        },
      );
      const proceed = shouldDoIncrementalGCalSync(userMeta);

      if (!proceed) {
        webSocketServer.handleImportGCalEnd(userId, {
          operation: "INCREMENTAL",
          status: "IGNORED",
          message: `User ${userId} gcal incremental sync is in progress or completed, ignoring this request`,
        });

        return;
      }

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "IMPORTING" } },
      });

      const syncImport = gcal
        ? await createSyncImport(gcal)
        : await createSyncImport(userId);

      const result = await syncImport.importLatestEvents(userId, perPage);

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "COMPLETED" } },
      });

      webSocketServer.handleImportGCalEnd(userId, {
        operation: "INCREMENTAL",
        status: "COMPLETED",
      });
      webSocketServer.handleBackgroundCalendarChange(userId);

      return result;
    } catch (error) {
      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "ERRORED" } },
      });

      logger.error(
        `Incremental Google Calendar sync failed for user: ${userId}`,
        error,
      );

      webSocketServer.handleImportGCalEnd(userId, {
        operation: "INCREMENTAL",
        status: "ERRORED",
        message: `Incremental Google Calendar sync failed for user: ${userId}`,
      });

      throw error;
    }
  };

  refreshWatch = async (
    userId: string,
    payload: Params_WatchEvents,
    gcal?: gCalendar,
  ) => {
    if (!gcal) gcal = await getGcalClient(userId);

    const watchExists = payload.channelId && payload.resourceId;

    if (watchExists) {
      await this.stopWatch(userId, payload.channelId, payload.resourceId, gcal);
    }

    const watchResult = await this.startWatchingGcalResources(
      userId,
      [{ gCalendarId: payload.gCalendarId, quotaUser: payload.quotaUser }],
      gcal,
    );

    return watchResult[0];
  };

  runMaintenance = async () => {
    const cursor = mongoService.user.find().batchSize(MONGO_BATCH_SIZE);
    const users: ObjectId[] = [];
    const result = {
      deleted: 0,
      refreshed: 0,
      ignored: 0,
      pruned: 0,
      revoked: 0,
      resynced: 0,
    };

    for await (const user of cursor) {
      users.push(user._id);
    }

    const { default: pLimit } = await import("p-limit"); // esm module support
    // Limit concurrency to avoid resource exhaustion and API rate limits
    const limit = pLimit(5); // Adjust concurrency as needed

    const run = await Promise.all(
      users.map((user) =>
        limit(() =>
          this.runMaintenanceByUser(user.toString(), {
            log: false,
          }).catch((error) => {
            logger.error(
              `Error running sync maintenance for user: ${user.toString()}`,
              error,
            );

            return {
              ignore: [{ user: user.toString(), payload: [] }],
              prune: [{ user: user.toString(), payload: [] }],
              refresh: [{ user: user.toString(), payload: [] }],
              ...result,
            };
          }),
        ),
      ),
    );

    const results = run.reduce(
      (acc, res) => ({
        deleted: acc.deleted + res.deleted,
        refreshed: acc.refreshed + res.refreshed,
        ignored: acc.ignored + res.ignored,
        pruned: acc.pruned + res.pruned,
        revoked: acc.revoked + res.revoked,
        resynced: acc.resynced + res.resynced,
      }),
      result,
    );

    logger.debug(`Sync Maintenance Results:
      IGNORED: ${results.ignored}
      PRUNED: ${results.pruned}
      REFRESHED: ${results.refreshed}

      DELETED DURING PRUNE: ${results.deleted}
      REVOKED SESSION DURING REFRESH: ${results.revoked}
      RESYNCED DURING REFRESH: ${results.resynced}
    `);

    return results;
  };

  runMaintenanceByUser = async (
    userId: string,
    params: { dry?: boolean; log?: boolean } = { log: true },
  ) => {
    const user = await findCompassUserBy("_id", userId);
    const maintenance = await prepWatchMaintenanceForUser(userId);
    const ignore = [{ user: userId, payload: maintenance.ignore }];
    const prune = [{ user: userId, payload: maintenance.prune }];
    const refresh = [{ user: userId, payload: maintenance.refresh }];

    const result = {
      ignore,
      prune,
      refresh,
      user: user?.email || "Not found",
      ignored: 0,
      pruned: 0,
      refreshed: 0,
      revoked: 0,
      deleted: 0,
      resynced: 0,
    };

    if (params?.dry) return result;

    const pruneResult = await pruneSync(prune);
    const pruned = pruneResult.filter((p) => !p.deletedUserData);
    const deletedDuringPrune = pruneResult.filter((p) => p.deletedUserData);
    const refreshResult = await refreshWatch(refresh);
    const refreshed = refreshResult;
    const resynced = refreshResult.filter((r) => r.resynced);

    if (params?.log) {
      logger.debug(`Sync Maintenance Results:
        IGNORED: ${ignore.length}
        PRUNED: ${pruned.flatMap((p) => p.results).length}
        REFRESHED: ${refreshed.flatMap((r) => r.results.filter((r) => r.success)).length}

        DELETED DURING PRUNE: ${deletedDuringPrune.map((r) => r.user).toString()}
        RESYNCED DURING REFRESH: ${resynced.map((r) => r.user).toString()}
      `);
    }

    return {
      ...result,
      ignored: ignore.flatMap(({ payload }) => payload).length,
      pruned: pruned.flatMap(({ results }) => results).length,
      refreshed: refreshed.flatMap(({ results }) =>
        results.filter((r) => r.success),
      ).length,
      deleted: deletedDuringPrune.length,
      resynced: resynced.length,
    };
  };

  restartGoogleCalendarSync = async (
    userId: string,
    options: { force?: boolean } = {},
  ) => {
    const { default: userService } =
      await import("@backend/user/services/user.service");
    const isForce = options.force === true;

    try {
      const userMeta = await userService.fetchUserMetadata(userId);
      const importStatus = userMeta.sync?.importGCal;
      const isImporting = importStatus === "IMPORTING";
      const proceed = isForce ? !isImporting : shouldImportGCal(userMeta);

      if (!proceed) {
        webSocketServer.handleImportGCalEnd(userId, {
          operation: "REPAIR",
          status: "IGNORED",
          message: `User ${userId} gcal import is in progress or completed, ignoring this request`,
        });

        return;
      }

      logger.warn(
        `Restarting Google Calendar sync for user: ${userId}${isForce ? " (forced)" : ""}`,
      );
      webSocketServer.handleImportGCalStart(userId);
      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "IMPORTING" } },
      });

      await userService.stopGoogleCalendarSync(userId);
      const importResults = await this.startGoogleCalendarSync(userId);

      await syncCompassEventsToGoogle(userId).catch((err) => {
        logger.error(
          `Failed to sync Compass events to Google Calendar for user: ${userId}`,
          err,
        );
      });

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "COMPLETED" } },
      });

      webSocketServer.handleImportGCalEnd(userId, {
        operation: "REPAIR",
        status: "COMPLETED",
        ...importResults,
      });
      webSocketServer.handleBackgroundCalendarChange(userId);
    } catch (err) {
      try {
        await userService.stopGoogleCalendarSync(userId);
      } catch (cleanupError) {
        logger.error(
          `Failed to clean up partial Google Calendar sync state for user: ${userId}`,
          cleanupError,
        );
      }

      if (isInvalidGoogleToken(err)) {
        logger.warn(
          `Google Calendar repair failed because access was revoked for user: ${userId}`,
        );

        await userService.pruneGoogleData(userId);
        webSocketServer.handleGoogleRevoked(userId);
        return;
      }

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "ERRORED" } },
      });

      logger.error(`Re-sync failed for user: ${userId}`, err);

      webSocketServer.handleImportGCalEnd(userId, {
        operation: "REPAIR",
        status: "ERRORED",
        message: getGoogleRepairErrorMessage(err),
      });
    }
  };

  startGoogleCalendarSync = async (
    user: string,
  ): Promise<{ eventsCount: number; calendarsCount: number }> => {
    const gcal = await getGcalClient(user);

    const calendarInit = await calendarService.initializeGoogleCalendars(
      user,
      gcal,
    );

    const gCalendarIds = calendarInit.googleCalendars
      .map(({ id }) => id)
      .filter((id) => id !== undefined && id !== null);

    const importResults = await this.importFull(gcal, gCalendarIds, user);

    await Promise.resolve(isUsingHttps()).then((yes) =>
      yes
        ? this.startWatchingGcalResources(
            user,
            [
              { gCalendarId: Resource_Sync.CALENDAR },
              ...gCalendarIds.map((gCalendarId) => ({ gCalendarId })),
            ],
            gcal,
          )
        : [],
    );

    const eventsCount = importResults.reduce(
      (sum, result) => sum + result.totalChanged,
      0,
    );

    return {
      eventsCount,
      calendarsCount: gCalendarIds.length,
    };
  };

  startWatchingGcalCalendars = async (
    user: string,
    params: Pick<Params_WatchEvents, "quotaUser">,
    gcal: gCalendar,
  ): Promise<{ acknowledged: boolean; insertedId?: ObjectId }> => {
    try {
      const alreadyWatching = await isWatchingGoogleResource(
        user,
        Resource_Sync.CALENDAR,
      );

      if (alreadyWatching) {
        logger.error(
          `Skipped Start Watch for ${Resource_Sync.CALENDAR}`,
          WatchError.CalendarWatchExists,
        );

        return { acknowledged: false };
      }

      const expiration = getChannelExpiration();
      const _id = new ObjectId();
      const channelId = _id.toString();

      const { watch: gcalWatch } = await gcalService.watchCalendars(gcal, {
        ...params,
        channelId,
        expiration,
      });

      const watch = await mongoService.watch
        .insertOne(
          WatchSchema.parse({
            _id,
            user,
            gCalendarId: Resource_Sync.CALENDAR,
            resourceId: gcalWatch.resourceId!,
            expiration: ExpirationDateSchema.parse(gcalWatch.expiration),
            createdAt: new Date(),
          }),
        )
        .catch(async (error) => {
          await this.stopWatch(user, channelId, gcalWatch.resourceId!, gcal);

          throw error;
        });

      return watch;
    } catch (err) {
      logger.error(`Error starting calendar watch for user: ${user}`, err);

      return { acknowledged: false };
    }
  };

  startWatchingGcalEvents = async (
    user: string,
    params: Pick<Params_WatchEvents, "gCalendarId" | "quotaUser">,
    gcal: gCalendar,
  ): Promise<{ acknowledged: boolean; insertedId?: ObjectId }> => {
    try {
      const alreadyWatching = await isWatchingGoogleResource(
        user,
        params.gCalendarId,
      );

      if (alreadyWatching) {
        logger.error(
          `Skipped Start Watch for ${params.gCalendarId} ${Resource_Sync.EVENTS}`,
          WatchError.EventWatchExists,
        );

        return { acknowledged: false };
      }

      const expiration = getChannelExpiration();
      const _id = new ObjectId();
      const channelId = _id.toString();

      const { watch: gcalWatch } = await gcalService.watchEvents(gcal, {
        ...params,
        channelId,
        expiration,
      });

      const watch = await mongoService.watch
        .insertOne(
          WatchSchema.parse({
            _id,
            user,
            gCalendarId: params.gCalendarId,
            resourceId: gcalWatch.resourceId!,
            expiration: ExpirationDateSchema.parse(gcalWatch.expiration),
            createdAt: new Date(),
          }),
        )
        .catch(async (error) => {
          await this.stopWatch(user, channelId, gcalWatch.resourceId!, gcal);

          throw error;
        });

      return watch;
    } catch (err) {
      logger.error(`Error starting events watch for user: ${user}`, err);

      return { acknowledged: false };
    }
  };

  startWatchingGcalResources = async (
    userId: string,
    watchParams: Pick<Params_WatchEvents, "gCalendarId" | "quotaUser">[],
    gcal: gCalendar,
  ) => {
    return Promise.all(
      watchParams.map(async (params) => {
        if (params.gCalendarId === (Resource_Sync.CALENDAR as string)) {
          return this.startWatchingGcalCalendars(userId, params, gcal);
        }

        return this.startWatchingGcalEvents(userId, params, gcal);
      }),
    ).then((results) => results.filter((r) => r !== undefined));
  };

  stopWatch = async (
    user: string,
    channelId: string,
    resourceId: string,
    gcal?: gCalendar,
    quotaUser?: string,
    session?: ClientSession,
  ) => {
    const filter = { user, _id: new ObjectId(channelId), resourceId };

    try {
      if (!gcal) gcal = await getGcalClient(user);

      await gcalService.stopWatch(gcal, {
        quotaUser,
        channelId,
        resourceId,
      });

      await mongoService.watch.deleteOne(filter, { session });

      return { channelId, resourceId };
    } catch (e) {
      const status = getGoogleErrorStatus(e);

      if (status === 404) {
        await mongoService.watch.deleteOne(filter, { session });

        logger.warn(
          "Channel no longer exists. Corresponding sync record deleted",
        );

        return undefined;
      }

      if (status === 401 || isInvalidGoogleToken(e)) {
        await mongoService.watch.deleteOne(filter, { session });

        logger.warn(
          "Google authorization is no longer valid. Corresponding sync record deleted",
        );

        return undefined;
      }

      if (isMissingGoogleRefreshToken(e)) {
        await mongoService.watch.deleteOne(filter, { session });

        logger.warn(
          "Google refresh token is missing. Corresponding watch record deleted",
        );

        return undefined;
      }

      throw e;
    }
  };

  stopWatches = async (
    user: string,
    gcal?: gCalendar,
    quotaUser?: string,
    session?: ClientSession,
  ): Promise<Result_Watch_Stop> => {
    const prepared = await this.prepareStopWatches(user, gcal, session);

    if (prepared.watches.length === 0) {
      return [];
    }

    logger.debug(
      `Stopping ${prepared.watches.length} gcal event watches for user: ${user}`,
    );
    const result = await Promise.all(
      prepared.watches.map(async ({ _id, resourceId }) =>
        this.stopWatch(
          user,
          _id.toString(),
          resourceId,
          prepared.gcal,
          quotaUser,
          session,
        ).catch((error) => {
          logger.error(
            `Error stopping watch for user: ${user}, channelId: ${_id.toString()}`,
            error,
          );

          return undefined;
        }),
      ),
    );

    const stopped = result.filter((identity) => identity !== undefined);

    return stopped;
  };
}

export const syncCompassEventsToGoogle = async (
  userId: string,
): Promise<number> => {
  const compassEvents = await mongoService.event
    .find({
      user: userId,
      isSomeday: false,
      "recurrence.eventId": { $exists: false },
      $or: [
        // no gEventId means it has not been synced to Google yet
        { gEventId: { $exists: false } },
        { gEventId: null },
        { gEventId: "" },
      ],
    } as Filter<Omit<Schema_Event, "_id">>)
    .sort({ startDate: 1 })
    .toArray();

  let syncedCount = 0;

  for (const compassEvent of compassEvents) {
    if (
      !compassEvent.startDate ||
      !compassEvent.endDate ||
      !compassEvent.user
    ) {
      continue;
    }

    const gEvent = await _createGcal(
      userId,
      compassEvent as unknown as Schema_Event_Core,
    );
    const gEventId = gEvent.id;

    if (!gEventId) {
      continue;
    }

    await mongoService.event.updateOne(
      { _id: compassEvent._id, user: userId },
      { $set: { gEventId } },
    );

    syncedCount += 1;

    if (!compassEvent.recurrence?.rule) {
      continue;
    }

    const instances = await mongoService.event
      .find({
        user: userId,
        "recurrence.eventId": compassEvent._id.toString(),
      })
      .sort({ startDate: 1 })
      .toArray();

    for (const instance of instances) {
      const providerData = MapEvent.toGcalInstanceProviderData(
        {
          ...instance,
          _id: instance._id.toString(),
        } as Parameters<typeof MapEvent.toGcalInstanceProviderData>[0],
        {
          ...compassEvent,
          _id: compassEvent._id.toString(),
          gEventId,
        } as Parameters<typeof MapEvent.toGcalInstanceProviderData>[1],
      );

      await mongoService.event.updateOne(
        { _id: instance._id, user: userId },
        { $set: providerData },
      );
    }
  }

  return syncedCount;
};

export default new SyncService();
