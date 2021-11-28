import calendar from "googleapis/build/src/apis/calendar";

/* Google API */
export declare type gSchema$Event = calendar.calendar_v3.Schema$Event;

export declare type gSchema$Events = calendar.calendar_v3.Schema$Events;
export declare type gSchema$Events$Union = gSchema$Events | gSchema$Events[];

export declare type gParamsEventsList =
  calendar.calendar_v3.Params$Resource$Events$List;
