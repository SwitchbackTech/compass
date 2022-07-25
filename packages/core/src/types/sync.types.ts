import { BaseError } from "@core/errors/errors.base";
import { gSchema$Channel } from "@core/types/gcal";
import {
  AnyBulkWriteOperation,
  BulkWriteResult,
  Document,
  ModifyResult,
  WithId,
} from "mongodb";

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
export interface Request_Sync_Gcal {
  channelId: string;
  resourceId: string;
  resourceState: string;
  expiration: string;
}

export type Resource_Sync = "calendarlist" | "events" | "settings";
export interface Result_Import_Gcal {
  total: number;
  // nextSyncToken: string | null | undefined;
  nextSyncToken: string;
  errors: unknown[];
}

export interface Result_Notif_Gcal {
  params: object;
  init?: object;
  prep?: Result_Sync_Prep_Gcal;
  sync?: Result_Sync_Gcal;
}
export interface Result_Watch_Delete {
  result: string;
}

export interface Result_Watch_Start {
  channel: gSchema$Channel;
  saveForDev?: "success" | "failed";
  syncUpdate: ModifyResult;
}

export interface Result_Watch_Stop {
  stopWatching: {
    result: string;
    channelId?: string;
    resourceId?: string;
    debug?: object;
  };
  deleteWatch: Result_Watch_Delete;
}

export interface Result_Watch_Stop_All {
  summary: string;
  watches?: string[];
  message?: string;
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

export interface Schema_Watch_Gcal extends WithId<Document> {
  channelId: string;
  resourceId: string;
}
