import { BaseError } from "@core/errors/errors.base";
import { gSchema$Channel } from "@core/types/gcal";
import { BulkWriteResult, AnyBulkWriteOperation } from "mongodb";

export interface Body_Watch_Gcal_Stop {
  channelId: string;
  resourceId: string;
}

export interface Body_Watch_Gcal_Start {
  calendarId: string;
  channelId: string;
}

export interface Params_Sync_Gcal extends Request_Sync_Gcal {
  nextSyncToken: string;
  userId: string;
  calendarId?: string;
}

export interface Result_Import_Gcal {
  total: number;
  nextSyncToken: string | null | undefined;
  errors: any[];
}

export interface Result_Notif_Gcal {
  params: object;
  init?: object;
  prep?: Result_Sync_Prep_Gcal;
  sync?: Result_Sync_Gcal;
}

export interface Result_Start_Watch {
  channel: gSchema$Channel;
  saveForDev?: string;
}

export interface Result_Stop_Watch {
  stopWatching: {
    result: string;
    channelId?: string;
    resourceId?: string;
    debug?: object;
  };
  deleteForDev?: string;
}

export interface Result_Sync_Gcal {
  syncToken?: object;
  events?: undefined | BulkWriteResult;
}

export interface Result_Sync_Prep_Gcal {
  syncToken: string;
  operations: AnyBulkWriteOperation[];
  errors: BaseError[];
}

export interface Request_Sync_Gcal {
  channelId: string;
  resourceId: string;
  resourceState: string;
  expiration: string;
}
