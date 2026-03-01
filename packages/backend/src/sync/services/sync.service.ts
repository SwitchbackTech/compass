import { ClientSession, ObjectId } from "mongodb";
import { RESULT_NOTIFIED_CLIENT } from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import { gCalendar } from "@core/types/gcal";
import {
  Params_WatchEvents,
  Payload_Sync_Notif,
  Resource_Sync,
  Result_Watch_Stop,
} from "@core/types/sync.types";
import { ExpirationDateSchema } from "@core/types/type.utils";
import { Schema_Watch, WatchSchema } from "@core/types/watch.types";
import { shouldDoIncrementalGCalSync } from "@core/util/event/event.util";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import { Collections } from "@backend/common/constants/collections";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import {
  getGoogleErrorStatus,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
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

  async cleanupStaleWatchChannel({
    channelId,
    resourceId,
  }: Payload_Sync_Notif): Promise<boolean> {
    const channels: Schema_Watch[] = [];

    const channel = await mongoService.watch.findOne({
      _id: channelId,
      resourceId,
    });

    if (channel) channels.push(channel);

    if (!channel) {
      logger.warn(
        `Exact match not found for stale watch record cleanup: { channelId: ${channelId}, resourceId: ${resourceId}}. Extending Search using resourceId only.`,
      );

      const resourceMatchedChannels = await mongoService.watch
        .find({ resourceId })
        .toArray();

      if (resourceMatchedChannels.length > 0) {
        logger.warn(
          `Found ${resourceMatchedChannels.length} watch records with resourceId: ${resourceId}.`,
        );

        channels.push(...resourceMatchedChannels);
      }
    }

    const possibleUserIds = new Set(channels.map((c) => c.user));

    if (possibleUserIds.size === 0) {
      logger.error(
        `Stale watch cleanup failed. Couldn't find any watch based on this channelId: ${channelId} or resourceId: ${resourceId}`,
      );

      return false;
    }

    const deleted = await Promise.all(
      [...possibleUserIds].map(async (user): Promise<boolean> => {
        const result = await this.stopWatch(
          user,
          channelId.toString(),
          resourceId,
        );

        if (result) {
          logger.warn(
            `Cleaned up stale watch for user: ${user} with channelId: ${channelId} with resourceId: ${resourceId}`,
          );

          return true;
        }

        return false;
      }),
    );

    return deleted.some((d) => d);
  }

  handleGcalNotification = async (payload: Payload_Sync_Notif) => {
    const { channelId, resourceId, resourceState, resource } = payload;
    const { expiration } = payload;

    if (resourceState === "sync") {
      logger.info(
        `${resource} sync initialized for channelId: ${payload.channelId}`,
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

      throw error(
        WatchError.NoWatchRecordForUser,
        `Notification not handled because no watch record found for channel: ${payload.channelId}`,
      );
    }

    const sync = await getSync({ userId: watch.user, resource });

    if (!sync) {
      // clean up stale watch channel;
      const cleanedUp = await this.cleanupStaleWatchChannel(payload);

      if (cleanedUp) return "IGNORED";

      throw error(
        SyncError.NoSyncRecordForUser,
        `Notification not handled because no sync record found with channel: ${payload.channelId}`,
      );
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

      const eventImports = Promise.all(
        gCalendarIds.map(async (gCalId) => {
          const { nextSyncToken, ...result } = await syncImport.importAllEvents(
            userId,
            gCalId,
            2500,
          );

          if (isUsingHttps()) {
            await updateSync(
              Resource_Sync.EVENTS,
              userId,
              gCalId,
              { nextSyncToken },
              session,
            );
          } else {
            logger.warn(
              `Skipped updating sync token for user: ${userId} and gCalId: ${gCalId} because not using https`,
            );
          }

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

      const userMeta = await userMetadataService.fetchUserMetadata(userId);
      const proceed = shouldDoIncrementalGCalSync(userMeta);

      if (!proceed) {
        webSocketServer.handleImportGCalEnd(
          userId,
          `User ${userId} gcal incremental sync is in progress or completed, ignoring this request`,
        );

        return;
      }

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "importing" } },
      });

      const syncImport = gcal
        ? await createSyncImport(gcal)
        : await createSyncImport(userId);

      const result = await syncImport.importLatestEvents(userId, perPage);

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "completed" } },
      });

      webSocketServer.handleImportGCalEnd(userId);
      webSocketServer.handleBackgroundCalendarChange(userId);

      return result;
    } catch (error) {
      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "errored" } },
      });

      logger.error(
        `Incremental Google Calendar sync failed for user: ${userId}`,
        error,
      );

      webSocketServer.handleImportGCalEnd(
        userId,
        `Incremental Google Calendar sync failed for user: ${userId}`,
      );

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
        PRUNED: ${pruned.flatMap((p) => p.results).toString()}
        REFRESHED: ${refreshed.flatMap((r) => r.results.filter((r) => r.success)).toString()}

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
        switch (params.gCalendarId) {
          case Resource_Sync.CALENDAR:
            return this.startWatchingGcalCalendars(userId, params, gcal);
          default:
            return this.startWatchingGcalEvents(userId, params, gcal);
        }
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
    if (!gcal) gcal = await getGcalClient(user);

    const filter = { user, _id: new ObjectId(channelId), resourceId };

    try {
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

      throw e;
    }
  };

  stopWatches = async (
    user: string,
    gcal?: gCalendar,
    quotaUser?: string,
    session?: ClientSession,
  ): Promise<Result_Watch_Stop> => {
    logger.debug(`Stopping all gcal event watches for user: ${user}`);

    if (!gcal) gcal = await getGcalClient(user);

    const watches = await mongoService.watch
      .find({ user }, { session })
      .toArray();

    const result = await Promise.all(
      watches.map(async ({ _id, resourceId }) =>
        this.stopWatch(
          user,
          _id.toString(),
          resourceId,
          gcal,
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

export default new SyncService();
