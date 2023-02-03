import { BaseError } from "@core/errors/errors.base";
import { AnyBulkWriteOperation, BulkWriteResult } from "mongodb";

export interface Params_Sync_Gcal extends Payload_Sync_Notif {
  nextSyncToken: string;
  userId: string;
  calendarId?: string;
}
export interface Params_WatchEvents {
  gCalendarId: string;
  channelId: string;
  expiration: string;
  nextSyncToken?: string;
}
export interface Payload_Resource_Events {
  gCalendarId: string;
  channelId: string;
  expiration: string;
  resourceId: string;
  nextSyncToken?: string;
}

export interface Payload_Resource_Events_TokenOptional
  extends Omit<Payload_Resource_Events, "nextSyncToken"> {
  nextSyncToken?: string;
}
export interface Payload_Sync_Events extends Payload_Resource_Events {
  lastRefreshedAt?: Date;
  lastSyncedAt?: Date;
}

export interface Payload_Sync_Notif {
  channelId: string;
  resourceId: string;
  resourceState: string;
  expiration: string;
}

export interface Payload_Sync_Refresh {
  userId: string;
  payloads: Payload_Sync_Events[];
}

export type Resource_Sync = "calendarlist" | "events" | "settings";
export interface Result_Import_Gcal {
  total: number;
  nextSyncToken: string;
  errors: unknown[];
}

export interface Result_Notif_Gcal {
  params: object;
  init?: object;
  prep?: Result_Sync_Prep_Gcal;
  sync?: Result_Sync_Gcal;
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
export interface Result_Watch_Delete {
  result: string;
}

export type Result_Watch_Stop = {
  channelId: string;
  resourceId: string;
}[];

export interface Schema_Sync {
  user: string;
  google: {
    calendarlist: {
      gCalendarId: string;
      nextSyncToken: string;
      lastSyncedAt: Date;
    }[];
    events: Payload_Sync_Events[];
  };
}
