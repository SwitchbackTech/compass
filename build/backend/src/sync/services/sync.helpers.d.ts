import { AnyBulkWriteOperation } from "mongodb";
import { gSchema$Event } from "@core/types/gcal";
import { Request_Sync_Gcal } from "@core/types/sync.types";
import { Schema_CalendarList } from "@core/types/calendar.types";
export declare const assembleBulkOperations: (
  userId: string,
  eventsToDelete: string[],
  eventsToUpdate: gSchema$Event[]
) => AnyBulkWriteOperation<import("bson").Document>[];
export declare const categorizeGcalEvents: (events: gSchema$Event[]) => {
  eventsToDelete: string[];
  eventsToUpdate: import("googleapis").calendar_v3.Schema$Event[];
};
export declare const channelExpiresSoon: (expiry: string) => boolean;
export declare const channelNotFound: (
  calendar: Schema_CalendarList,
  channelId: string
) => boolean;
export declare const channelRefreshNeeded: (
  reqParams: Request_Sync_Gcal,
  calendar: Schema_CalendarList
) => boolean;
export declare const findCalendarByResourceId: (
  resourceId: string,
  calendarList: Schema_CalendarList
) => import("@core/types/calendar.types").Schema_GCal | undefined;
export declare const getChannelExpiration: () => string;
export declare const hasExpectedHeaders: (headers: object) => boolean;
//# sourceMappingURL=sync.helpers.d.ts.map
