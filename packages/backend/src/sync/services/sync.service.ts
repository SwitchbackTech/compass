import { GaxiosError } from "gaxios";
import { ObjectId } from "mongodb";
import { RESULT_NOTIFIED_CLIENT } from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import { gCalendar } from "@core/types/gcal";
import {
  Params_WatchEvents,
  Payload_Sync_Notif,
  Resource_Sync,
  Result_Watch_Stop,
} from "@core/types/sync.types";
import { Schema_Watch, WatchSchema } from "@core/types/watch.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Collections } from "@backend/common/constants/collections";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
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

const logger = Logger("app:sync.service");

class SyncService {
  deleteAllByGcalId = async (gCalendarId: string) => {
    const delRes = await mongoService.db
      .collection(Collections.SYNC)
      .deleteMany({ "google.events.gCalendarId": gCalendarId });
    return delRes;
  };

  deleteAllByUser = async (userId: string) => {
    const delRes = await mongoService.db
      .collection(Collections.SYNC)
      .deleteMany({ user: userId });
    return delRes;
  };

  deleteByIntegration = async (integration: "google", userId: string) => {
    const response = await mongoService.db
      .collection(Collections.SYNC)
      .updateOne({ user: userId }, { $unset: { [integration]: "" } });

    return response;
  };

  async cleanupStaleWatchChannel({
    channelId,
    resourceId,
  }: Payload_Sync_Notif): Promise<boolean> {
    const syncs = await mongoService.sync
      .find({
        "google.events.resourceId": resourceId,
        "google.events.channelId": { $ne: channelId },
      })
      .toArray();

    const deleted = await Promise.all(
      syncs.map(async (sync): Promise<boolean> => {
        if (!sync || !sync.user) {
          logger.error(
            `Stale watch cleanup failed. Couldn't find user based on this resourceId: ${resourceId}`,
          );

          return false;
        }

        const userId = sync.user;
        const result = await this.stopWatch(userId, channelId, resourceId);

        if (result?.channelId) {
          logger.warn(
            `Cleaned up stale watch for channelId: ${channelId} with resourceId: ${resourceId}`,
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

    if (resourceState !== "exists") {
      logger.info(
        `${resource} sync initialized for channelId: ${payload.channelId}`,
      );

      return "INITIALIZED";
    }

    const _id = new ObjectId(channelId);
    const watch = await mongoService.watch.findOne({ _id, resourceId });
    const sync = watch?.user
      ? await getSync({ userId: watch.user, resource })
      : undefined;

    if (!sync || !watch) {
      // clean up stale watch channel;
      const cleanedUp = await this.cleanupStaleWatchChannel(payload);

      if (cleanedUp) return "IGNORED";

      throw error(
        SyncError.NoSyncRecordForUser,
        `Notification not handled because no sync record found with channel: ${payload.channelId}`,
      );
    }

    const userId = sync.user;
    const { events, calendarlist } = sync.google;
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
      userId,
      watch.gCalendarId,
      nextSyncToken,
    );

    await handler.handleNotification();

    const wsResult = webSocketServer.handleBackgroundCalendarChange(userId);

    const result = wsResult?.includes(RESULT_NOTIFIED_CLIENT)
      ? "PROCESSED AND NOTIFIED CLIENT"
      : "PROCESSED IN BACKGROUND";

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
    const syncImport = gcal
      ? await createSyncImport(gcal)
      : await createSyncImport(userId);

    const result = await syncImport.importLatestEvents(userId, perPage);

    return result;
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
    const cursor = mongoService.user.find().batchSize(1000);
    const refresh: Array<{ user: string; payload: Schema_Watch[] }> = [];
    const prune: Array<{ user: string; payload: Schema_Watch[] }> = [];
    const ignore: Array<{ user: string; payload: Schema_Watch[] }> = [];

    let ignored = 0;
    let pruned = 0;
    let revoked = 0;
    let deleted = 0;
    let refreshed = 0;
    let resynced = 0;

    while (await cursor.hasNext()) {
      const user = await cursor.next();

      if (!user) continue;

      const run = await this.runMaintenanceByUser(user._id.toString(), {
        log: false,
      });

      ignore.push(...run.ignore);
      prune.push(...run.prune);
      refresh.push(...run.refresh);

      deleted += run.deleted;
      refreshed += run.refreshed;
      ignored += run.ignored;
      pruned += run.pruned;
      revoked += run.revoked;
      resynced += run.resynced;
    }

    logger.debug(`Sync Maintenance Results:
      IGNORED: ${ignored}
      PRUNED: ${pruned}
      REFRESHED: ${refreshed}

      DELETED DURING PRUNE: ${deleted}
      REVOKED SESSION DURING REFRESH: ${revoked}
      RESYNCED DURING REFRESH: ${resynced}
    `);

    return { ignored, pruned, refreshed, revoked, deleted, resynced };
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
    const refreshed = refreshResult.filter((r) => !r.revokedSession);
    const revokedSession = refreshResult.filter((r) => r.revokedSession);
    const resynced = refreshResult.filter((r) => r.resynced);

    if (params?.log) {
      logger.debug(`Sync Maintenance Results:
        IGNORED: ${ignore.length}
        PRUNED: ${pruned.map((p) => p.user).toString()}
        REFRESHED: ${refreshed.map((r) => r.user).toString()}

        DELETED DURING PRUNE: ${deletedDuringPrune.map((r) => r.user).toString()}
        REVOKED SESSION DURING REFRESH: ${revokedSession
          .map((r) => r.user)
          .toString()}
        RESYNCED DURING REFRESH: ${resynced.map((r) => r.user).toString()}
      `);
    }

    return {
      ...result,
      ignored: ignore.length,
      pruned: pruned.length,
      refreshed: refreshed.length,
      revoked: revokedSession.length,
      deleted: deletedDuringPrune.length,
      resynced: resynced.length,
    };
  };

  startWatchingGcalCalendars = async (
    user: string,
    params: Pick<Params_WatchEvents, "quotaUser">,
    gcal: gCalendar,
  ) => {
    const alreadyWatching = await isWatchingGoogleResource(user);

    if (alreadyWatching) {
      throw error(
        WatchError.CalendarWatchExists,
        `Skipped Start Watch for ${Resource_Sync.CALENDAR}`,
      );
    }

    const { watch: gcalWatch } = await gcalService.watchCalendars(gcal, {
      ...params,
      channelId: new ObjectId().toString(),
      expiration: getChannelExpiration(),
    });

    const watch = await mongoService.watch.insertOne(
      WatchSchema.parse({
        _id: gcalWatch.id,
        user,
        gCalendarId: Resource_Sync.CALENDAR,
        resourceId: gcalWatch.resourceId,
        expiration: gcalWatch.expiration,
        createdAt: new Date(),
        lastNotifiedAt: new Date(0),
      }),
    );

    return watch;
  };

  startWatchingGcalEvents = async (
    user: string,
    params: Pick<Params_WatchEvents, "gCalendarId" | "quotaUser">,
    gcal: gCalendar,
  ) => {
    const alreadyWatching = await isWatchingGoogleResource(
      user,
      params.gCalendarId,
    );

    if (alreadyWatching) {
      throw error(
        WatchError.EventWatchExists,
        `Skipped Start Watch for ${params.gCalendarId}`,
      );
    }

    const { watch: gcalWatch } = await gcalService.watchEvents(gcal, {
      ...params,
      channelId: new ObjectId().toString(),
      expiration: getChannelExpiration(),
    });

    const watch = await mongoService.watch.insertOne(
      WatchSchema.parse({
        _id: gcalWatch.id,
        user,
        gCalendarId: Resource_Sync.CALENDAR,
        resourceId: gcalWatch.resourceId,
        expiration: gcalWatch.expiration,
        createdAt: new Date(),
        lastNotifiedAt: new Date(0),
      }),
    );

    return watch;
  };

  startWatchingGcalResources = async (
    userId: string,
    watchParams: Pick<Params_WatchEvents, "gCalendarId" | "quotaUser">[],
    gcal: gCalendar,
  ) => {
    return Promise.all(
      watchParams.map(async (params) => {
        switch (params.gCalendarId) {
          case Resource_Sync.CALENDAR: {
            return this.startWatchingGcalCalendars(userId, params, gcal).catch(
              (error) => {
                logger.error(error.message, error);

                return undefined;
              },
            );
          }
          default: {
            return this.startWatchingGcalEvents(userId, params, gcal).catch(
              (error) => {
                logger.error(error.message, error);

                return undefined;
              },
            );
          }
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
  ) => {
    if (!gcal) gcal = await getGcalClient(user);

    try {
      await gcalService.stopWatch(gcal, {
        quotaUser,
        channelId,
        resourceId: resourceId,
      });

      await mongoService.watch.deleteOne({
        user,
        _id: new ObjectId(channelId),
        resourceId,
      });

      return { channelId, resourceId };
    } catch (e) {
      const _e = e as GaxiosError;
      const code = (_e.code as unknown as number) || 0;

      if (_e.code === "404" || code === 404) {
        await mongoService.watch.deleteOne({
          user,
          _id: new ObjectId(channelId),
          resourceId,
        });

        logger.warn(
          "Channel no longer exists. Corresponding sync record deleted",
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
  ): Promise<Result_Watch_Stop> => {
    logger.debug(`Stopping all gcal event watches for user: ${user}`);

    if (!gcal) gcal = await getGcalClient(user);

    const watches = await mongoService.watch.find({ user }).toArray();

    const result = await Promise.all(
      watches.map(async ({ _id, resourceId }) =>
        gcalService
          .stopWatch(gcal, {
            quotaUser,
            channelId: _id.toString(),
            resourceId: resourceId,
          })
          .then(({ status }) =>
            status < 400 ? { _id, resourceId, user } : undefined,
          )
          .catch((error) => {
            logger.error(
              `Error stopping watch for user: ${user}, channelId: ${_id.toString()}`,
              error,
            );

            return undefined;
          }),
      ),
    );

    const stopped = result.filter((identity) => identity !== undefined);

    await mongoService.watch.deleteMany(stopped);

    return stopped.map(({ _id, resourceId }) => ({
      channelId: _id.toString(),
      resourceId,
    }));
  };
}

export default new SyncService();
