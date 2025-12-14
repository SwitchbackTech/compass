import type { calendar_v3 } from "@googleapis/calendar";

export declare type WithGcalId<T> = T & {
  id: string;
};

export declare type WithRecurrenceRule<T> = T & {
  recurrence: string[];
};
export declare type WithRecurrencePointer<T> = T & {
  recurringEventId: string;
};

/* Google API */
export declare type gCalendar = calendar_v3.Calendar;
export declare type gSchema$CalendarList = calendar_v3.Schema$CalendarList;
export declare type gSchema$CalendarListEntry =
  calendar_v3.Schema$CalendarListEntry;
export declare type gSchema$Channel = calendar_v3.Schema$Channel;
export declare type gSchema$Event = calendar_v3.Schema$Event;
export declare type gSchema$EventBase = WithGcalId<
  WithRecurrenceRule<gSchema$Event>
>;
export declare type gSchema$EventInstance = WithGcalId<
  WithRecurrencePointer<gSchema$Event>
>;

export declare type gSchema$Events = calendar_v3.Schema$Events;
export declare type gSchema$Events$Union = gSchema$Events | gSchema$Events[];

export declare type gParamsEventsList = calendar_v3.Params$Resource$Events$List;

/**
 * Params for importing all events from a calendar, excluding those
 * that would conflict with nextSyncToken
 *
 * @see https://developers.google.com/calendar/api/v3/reference/events/list
 */
export declare type gParamsImportAllEvents = Omit<
  gParamsEventsList,
  | "iCalUID"
  | "orderBy"
  | "privateExtendedProperty"
  | "q"
  | "sharedExtendedProperty"
  | "timeMin"
  | "timeMax"
  | "updatedMin"
>;
