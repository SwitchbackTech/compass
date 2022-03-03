import { gCalendar } from "@core/types/gcal";
import {
  Params_Sync_Gcal,
  Request_Sync_Gcal,
  Result_Notif_Gcal,
  Result_Start_Watch,
  Result_Stop_Watch,
  Result_Sync_Prep_Gcal,
} from "@core/types/sync.types";
import { BaseError } from "@core/errors/errors.base";
declare class SyncService {
  handleGcalNotification(
    reqParams: Request_Sync_Gcal
  ): Promise<Result_Notif_Gcal | BaseError>;
  startWatchingChannel(
    gcal: gCalendar,
    userId: string,
    calendarId: string,
    channelId: string
  ): Promise<Result_Start_Watch>;
  stopWatchingChannel(
    userId: string,
    channelId: string,
    resourceId: string
  ): Promise<Result_Stop_Watch | BaseError>;
  prepareSyncChannels: (reqParams: Request_Sync_Gcal) => Promise<{
    channelPrepResult: {
      stop: undefined;
      refresh: undefined;
      stillActive: undefined;
    };
    userId: string | undefined;
    gcal: import("googleapis").calendar_v3.Calendar;
    nextSyncToken: string;
  }>;
  prepareUpdate: (
    gcal: gCalendar,
    params: Params_Sync_Gcal
  ) => Promise<Result_Sync_Prep_Gcal>;
  refreshChannelWatch: (
    userId: string,
    gcal: gCalendar,
    reqParams: Request_Sync_Gcal
  ) => Promise<{
    stop: BaseError | Result_Stop_Watch;
    start: Result_Start_Watch;
    syncUpdate: string;
  }>;
  updateNextSyncToken: (
    userId: string,
    nextSyncToken: string
  ) => Promise<
    | {
        status: string;
        debugResult?: undefined;
      }
    | {
        status: string;
        debugResult: import("mongodb").ModifyResult<import("bson").Document>;
      }
  >;
  updateResourceId: (
    channelId: string,
    resourceId: string
  ) => Promise<import("mongodb").ModifyResult<import("bson").Document>>;
  updateSyncData: (
    userId: string,
    channelId: string,
    resourceId: string,
    expiration: string
  ) => Promise<import("mongodb").ModifyResult<import("bson").Document>>;
}
declare const _default: SyncService;
export default _default;
//# sourceMappingURL=sync.service.d.ts.map
