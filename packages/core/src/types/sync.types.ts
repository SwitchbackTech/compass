import { BaseError } from "@core/errors/errors.base";
import { gSchema$Channel } from "@core/types/gcal";
import { AnyBulkWriteOperation, BulkWriteResult, ModifyResult } from "mongodb";

export interface Params_Sync_Gcal extends Payload_Sync_Notif {
  nextSyncToken: string;
  userId: string;
  calendarId?: string;
}

export interface Payload_Resource_Events {
  gCalendarId: string;
  channelId: string;
  expiration: string;
  resourceId: string;
}

export interface Payload_Sync_Events extends Payload_Resource_Events {
  lastSyncedAt: Date;
  nextSyncToken: string;
}

export interface Payload_Sync_Notif {
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

//-- remove if unsed
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

export interface Schema_Sync {
  user: string;
  google: {
    calendarlist: Payload_Sync_Events[];
    events: Payload_Sync_Events[];
    // settings: Payload_Sync;
  };
}

/*
	]

//sync
user:
google:
	calendarlist:
		channelId: "4bd6a7c7-af60-4eeb-b7d0-82674c7c8353"
		expiration: 1659097148533
		resourceId: "DpB-6oO_rXZufO6D45aRkQo_TkU"
		lastSyncedAt: 
		nextSyncToken:
	events:
		[
			{
			// save calendarId (in addition to resourceId)
			// so you can reference it back to a calendarlist
			// which you can't do if you just have resourceId
			calendarId: "primary"
			channelId: "4bd6a7c7-af60-4eeb-b7d0-82674c7c8353"
			resourceId: "DpB-6oO_rXZufO6D45aRkQo_TkU"
			nextSyncToken:
			lastSyncedAt:
			},
			{
			calendarId: "8g3jsa8-23gasf..."
			channelId: "1234"
			resourceId: "asdfU"
			nextSyncToken:
			lastSyncedAt:
			}
		]
*/
