import calendar from "googleapis/build/src/apis/calendar";
import { calendar_v3 } from "googleapis";

/* Google API */
export declare type gCalendar = calendar_v3.Calendar;
export declare type gSchema$CalendarList = calendar_v3.Schema$CalendarList;
export declare type gSchema$CalendarListEntry =
  calendar_v3.Schema$CalendarListEntry;
export declare type gSchema$Channel = calendar.calendar_v3.Schema$Channel;
export declare type gSchema$Event = calendar.calendar_v3.Schema$Event;

export declare type gSchema$Events = calendar.calendar_v3.Schema$Events;
export declare type gSchema$Events$Union = gSchema$Events | gSchema$Events[];

export declare type gParamsEventsList =
  calendar.calendar_v3.Params$Resource$Events$List;
