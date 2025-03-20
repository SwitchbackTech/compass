import {
  RESULT_IGNORED,
  RESULT_NOTIFIED_CLIENT,
} from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import { Payload_Sync_Notif } from "@core/types/sync.types";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { getSync } from "@backend/sync/util/sync.queries";
import { getCalendarInfo } from "@backend/sync/util/sync.util";
import { createSyncImport } from "../import/sync.import";

const logger = Logger("app:sync.notify");

export const ACTIONS_SYNC = {
  INITIALIZED: "initialized",
  IGNORED: "ignored",
  PROCESSED: "processed",
} as const;

export const WS_RESULT = {
  UNPROCESSED: "unprocessed",
  IGNORED: RESULT_IGNORED,
  NOTIFIED_CLIENT: RESULT_NOTIFIED_CLIENT,
} as const;

export interface Result_Gcal_Notif {
  action: (typeof ACTIONS_SYNC)[keyof typeof ACTIONS_SYNC];
  updated: number;
  created: number;
  wsResult: (typeof WS_RESULT)[keyof typeof WS_RESULT];
}

export class SyncNotificationService {
  async handleGcalNotification(
    payload: Payload_Sync_Notif,
  ): Promise<Result_Gcal_Notif> {
    let result: Result_Gcal_Notif = {
      action: ACTIONS_SYNC.IGNORED,
      updated: 0,
      created: 0,
      wsResult: WS_RESULT.UNPROCESSED,
    };

    const { channelId, resourceId, resourceState } = payload;
    if (resourceState !== "exists") {
      logger.info(`Sync initialized for channelId: ${channelId}`);
      result = { ...result, action: ACTIONS_SYNC.INITIALIZED };
      return result;
    }

    const sync = await getSync({ resourceId });
    if (!sync) {
      logger.debug(
        `Ignored notification becasuse no sync for this resourceId: ${resourceId}`,
      );
      return result;
    }

    const { userId, gCalendarId, nextSyncToken } = getCalendarInfo(
      sync,
      resourceId,
    );

    const syncImport = await createSyncImport(userId);
    const importResult = await syncImport.importEventsByCalendar(
      userId,
      gCalendarId,
      nextSyncToken,
    );

    // notify user
    const wsResult = webSocketServer.handleBackgroundCalendarChange(userId);

    return {
      action: ACTIONS_SYNC.PROCESSED,
      updated: importResult.updated,
      created: importResult.created,
      wsResult,
    };
  }
}
