import { ObjectId } from "bson";
import type { AnyBulkWriteOperation, BulkWriteResult } from "mongodb";
import { z } from "zod/v4";
import { BaseError } from "@core/errors/errors.base";
import {
  Categories_Recurrence,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import {
  ExpirationDateSchema,
  IDSchemaV4,
  StringV4Schema,
  zObjectId,
} from "@core/types/type.utils";

export enum Resource_Sync {
  CALENDAR = "calendarlist",
  EVENTS = "events",
  SETTINGS = "settings",
}

export const ResourceSchema = z
  .enum([Resource_Sync.EVENTS, Resource_Sync.CALENDAR])
  .default(Resource_Sync.EVENTS);

export const SyncUserFilterSchema = z.object({ user: IDSchemaV4 });

export const SyncUserCalendarResourceFilterSchema = SyncUserFilterSchema.extend(
  { resource: ResourceSchema, gCalendarId: StringV4Schema },
).transform(({ user, resource, gCalendarId }) => ({
  user,
  [`google.${resource}.gCalendarId`]: gCalendarId,
}));

export const SyncFilterSchema = z.union([
  SyncUserCalendarResourceFilterSchema,
  SyncUserFilterSchema,
]);

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

export type Event_Transition = {
  title: string;
  id: ObjectId;
  calendar: ObjectId;
  user: ObjectId;
  transition: [Categories_Recurrence | null, TransitionCategoriesRecurrence];
  category: Categories_Recurrence;
  operation: Operation_Sync;
};

export type Summary_Sync = {
  summary: "PROCESSED" | "IGNORED";
  changes: Event_Transition[];
};

export type Operation_Sync =
  | `${Categories_Recurrence}_${"CREATED" | "UPDATED" | "DELETED"}`
  | "SERIES_CREATED"
  | "SERIES_UPDATED"
  | "SERIES_DELETED"
  | "SOMEDAY_SERIES_CREATED"
  | "SOMEDAY_SERIES_UPDATED"
  | "SOMEDAY_SERIES_DELETED"
  | "INSTANCES_UPDATED"
  | null;

export type SyncFilter = z.infer<typeof SyncFilterSchema>;
