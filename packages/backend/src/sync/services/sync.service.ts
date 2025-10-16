import { GaxiosError } from "gaxios";
import { v4 as uuidv4 } from "uuid";
import { RESULT_NOTIFIED_CLIENT } from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import { gCalendar } from "@core/types/gcal";
import {
  Params_WatchEvents,
  Payload_Sync_Events,
  Payload_Sync_Notif,
  Resource_Sync,
} from "@core/types/sync.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Collections } from "@backend/common/constants/collections";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { createSyncImport } from "@backend/sync/services/import/sync.import";
import {
  prepSyncMaintenance,
  prepSyncMaintenanceForUser,
  pruneSync,
  refreshSync,
} from "@backend/sync/services/maintain/sync.maintenance";
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";
import {
  deleteWatchData,
  getSync,
  isWatchingCalendars,
  isWatchingEventsByGcalId,
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

        if (result.channelId) {
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
    const { channelId, resourceId, resourceState } = payload;

    if (resourceState !== "exists") {
      logger.info(`Sync initialized for channelId: ${payload.channelId}`);
      return "INITIALIZED";
    }

    const sync = await getSync({ channelId, resourceId });

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
    const channel = sync.google.events.find((e) => e.channelId === channelId)!;
    const calendarId = channel.gCalendarId;
    const nextSyncToken = channel.nextSyncToken;

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
      calendarId,
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
    payload: Payload_Sync_Events,
    gcal?: gCalendar,
  ) => {
    if (!gcal) gcal = await getGcalClient(userId);

    const watchExists = payload.channelId && payload.resourceId;
    if (watchExists) {
      await this.stopWatch(
        userId,
        payload.channelId!,
        payload.resourceId!,
        gcal,
      );
    }

    const watchResult = await this.startWatchingGcalEvents(
      userId,
      {
        gCalendarId: payload.gCalendarId,
      },
      gcal,
    );

    return watchResult;
  };

  runMaintenance = async () => {
    const { ignored, toPrune, toRefresh } = await prepSyncMaintenance();

    const pruneResult = await pruneSync(toPrune);
    const pruned = pruneResult.filter((p) => !p.deletedUserData);
    const deletedDuringPrune = pruneResult.filter((p) => p.deletedUserData);

    const refreshResult = await refreshSync(toRefresh);
    const refreshed = refreshResult.filter((r) => !r.revokedSession);
    const revokedSession = refreshResult.filter((r) => r.revokedSession);
    const resynced = refreshResult.filter((r) => r.resynced);

    logger.debug(`Sync Maintenance Results:
      IGNORED: ${ignored.length}
      PRUNED: ${pruned.map((p) => p.user).toString()}
      REFRESHED: ${refreshed.map((r) => r.user).toString()}

      DELETED DURING PRUNE: ${deletedDuringPrune.map((r) => r.user).toString()}
      REVOKED SESSION DURING REFRESH: ${revokedSession
        .map((r) => r.user)
        .toString()}
      RESYNCED DURING REFRESH: ${resynced.map((r) => r.user).toString()}
    `);

    return {
      ignored: ignored.length,
      pruned: pruned.length,
      refreshed: refreshed.length,
      revoked: revokedSession.length,
      deleted: deletedDuringPrune.length,
    };
  };

  runMaintenanceByUser = async (userId: string, params: { dry: boolean }) => {
    const user = await findCompassUserBy("_id", userId);
    const _result = await prepSyncMaintenanceForUser(userId);
    const result = { ..._result, user: user?.email || "Not found" };

    if (params.dry) {
      return result;
    }

    switch (result.action) {
      case "ignore": {
        return result;
      }
      case "prune": {
        const pruneResult = await pruneSync([userId]);
        return { ...result, result: pruneResult };
      }
      case "refresh": {
        if (!result.payload) {
          return {
            ...result,
            result: { error: "Didn't refresh because payloads not included" },
          };
        }
        const refreshResult = await refreshSync([
          { userId, payloads: result.payload },
        ]);
        return { ...result, result: refreshResult };
      }
      default: {
        return { ...result, error: "No maintenance action" };
      }
    }
  };

  startWatchingGcalCalendars = async (userId: string, gcal: gCalendar) => {
    const alreadyWatching = await isWatchingCalendars(userId);

    if (alreadyWatching) {
      throw error(SyncError.CalendarWatchExists, "Skipped Start Watch");
    }

    const channelId = uuidv4();
    const expiration = getChannelExpiration();

    const watchParams: Omit<Params_WatchEvents, "gCalendarId"> = {
      channelId: channelId,
      expiration,
    };

    const { watch } = await gcalService.watchCalendars(gcal, watchParams);
    const { resourceId } = watch;

    if (!resourceId) {
      throw error(SyncError.NoResourceId, "Calendar Watch Failed");
    }

    const sync = await updateSync(Resource_Sync.CALENDAR, userId, null, {
      channelId,
      resourceId,
      expiration,
    });

    return sync;
  };

  startWatchingGcalEvents = async (
    userId: string,
    params: { gCalendarId: string },
    gcal: gCalendar,
  ) => {
    const alreadyWatching = await isWatchingEventsByGcalId(
      userId,
      params.gCalendarId,
    );
    if (alreadyWatching) {
      throw error(SyncError.EventWatchExists, "Skipped Start Watch");
    }

    const channelId = uuidv4();
    const expiration = getChannelExpiration();
    const watchParams: Params_WatchEvents = {
      gCalendarId: params.gCalendarId,
      channelId: channelId,
      expiration,
    };

    const { watch } = await gcalService.watchEvents(gcal, watchParams);
    const { resourceId } = watch;

    if (!resourceId) {
      throw error(SyncError.NoResourceId, "Event Watch Failed");
    }

    const sync = await updateSync(
      Resource_Sync.EVENTS,
      userId,
      params.gCalendarId,
      { channelId, resourceId, expiration },
    );

    return sync;
  };

  startWatchingGcalEventsById = async (
    userId: string,
    watchParams: { gCalId: string; nextSyncToken?: string }[],
    gcal: gCalendar,
  ) => {
    const eventWatches = watchParams.map(async (gInfo) => {
      await this.startWatchingGcalEvents(
        userId,
        { gCalendarId: gInfo.gCalId },
        gcal,
      );

      await updateSync(Resource_Sync.EVENTS, userId, gInfo.gCalId);
    });

    await Promise.all(eventWatches);
  };

  stopWatch = async (
    userId: string,
    channelId: string,
    resourceId: string,
    gcal?: gCalendar,
  ) => {
    if (!gcal) gcal = await getGcalClient(userId);

    const params = {
      requestBody: {
        id: channelId,
        resourceId: resourceId,
      },
    };

    try {
      const stopResult = await gcal.channels.stop(params);

      if (stopResult.status !== 204) {
        throw error(GenericError.NotSure, "Stop Failed");
      }

      await deleteWatchData({ events: { channelId, resourceId } });

      return { channelId, resourceId };
    } catch (e) {
      const _e = e as GaxiosError;
      const code = (_e.code as unknown as number) || 0;

      if (_e.code === "404" || code === 404) {
        await deleteWatchData({ events: { channelId, resourceId } });

        logger.warn(
          "Channel no longer exists. Corresponding sync record deleted",
        );

        return {};
      }

      throw e;
    }
  };

  stopWatches = async (userId: string) => {
    const sync = await getSync({ userId });

    if (!sync || !sync.google.events) {
      return [];
    }

    logger.debug(`Stopping all gcal event watches for user: ${userId}`);

    const gcal = await getGcalClient(userId);

    const stopped = [];
    for (const es of sync.google.events) {
      if (!es.channelId || !es.resourceId) {
        logger.debug(
          `Skipped stop for calendarId: ${es.gCalendarId} due to missing field(s):
            channelId: ${es.channelId}
            resourceid: ${es.resourceId}`,
        );
        continue;
      }

      await this.stopWatch(userId, es.channelId, es.resourceId, gcal);

      stopped.push({
        channelId: es.channelId,
        resourceId: es.resourceId,
      });
    }

    return stopped;
  };
}

export default new SyncService();
