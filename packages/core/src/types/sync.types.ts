import type { AnyBulkWriteOperation, BulkWriteResult } from "mongodb";
import { z } from "zod/v4";
import { BaseError } from "@core/errors/errors.base";
import { ExpirationDateSchema, zObjectId } from "@core/types/type.utils";

export interface Params_Sync_Gcal extends Payload_Sync_Notif {
  nextSyncToken: string;
  userId: string;
  calendarId?: string;
}

export interface Params_WatchEvents {
  gCalendarId: string;
  channelId: string; // use a valid mongo object id string
  resourceId: string;
  expiration: string;
  quotaUser?: string; // added to aid gcal API quota calculations
}

export interface SyncDetails {
  gCalendarId: string;
  nextSyncToken: string;
  nextPageToken?: string;
  lastSyncedAt?: Date;
}

export enum Resource_Sync {
  CALENDAR = "calendarlist",
  EVENTS = "events",
  SETTINGS = "settings",
}

export enum XGoogleResourceState {
  EXISTS = "exists",
  NOT_EXISTS = "not_exists",
  SYNC = "sync",
}

export const GcalNotificationSchema = z.object({
  resource: z.enum([Resource_Sync.EVENTS, Resource_Sync.CALENDAR]),
  channelId: zObjectId,
  resourceId: z.string().nonempty(),
  resourceState: z.enum(XGoogleResourceState),
  expiration: ExpirationDateSchema,
});

export type Payload_Sync_Notif = z.infer<typeof GcalNotificationSchema>;

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
  google?: {
    calendarlist: SyncDetails[];
    events: SyncDetails[];
  };
}
