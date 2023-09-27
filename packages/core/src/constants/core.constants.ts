export const APP_NAME = "Compass Calendar";
export const GCAL_NOTIFICATION_ENDPOINT = `/sync/gcal/notifications`;
export const MB_50 = 50000000; // in bytes
export const MS_IN_HR = 2.7777777777778e-7;
export const PORT_DEFAULT_API = 3000;
export const PORT_DEFAULT_WEB = 9080;
export const SOMEDAY_MONTHLY_LIMIT = 9;
export const SOMEDAY_WEEKLY_LIMIT = 9;
export const SOMEDAY_WEEK_LIMIT_MSG = `Sorry, you can only have ${SOMEDAY_WEEKLY_LIMIT} unscheduled events per week.`;
export const SOMEDAY_MONTH_LIMIT_MSG = `Sorry, you can only have ${SOMEDAY_MONTHLY_LIMIT} unscheduled events per month.`;
export const SYNC_DEBUG = "/api/sync/debug";

export enum NodeEnv {
  Development = "development",
  Production = "production",
  Test = "test",
}

/*
Signifies where an event originated from
*/
export enum Origin {
  COMPASS = "compass",
  GOOGLE = "google",
  GOOGLE_IMPORT = "googleimport",
  UNSURE = "unsure",
}

export type Priority =
  | Priorities.UNASSIGNED
  | Priorities.WORK
  | Priorities.SELF
  | Priorities.RELATIONS;

export enum Priorities {
  UNASSIGNED = "unassigned",
  WORK = "work",
  SELF = "self",
  RELATIONS = "relationships",
}

export const RRULE_COUNT_WEEKS = 12;
export const RRULE_COUNT_MONTHS = 3;
export const RRULE_WEEK_START = "SU";

export const RRULE = {
  WEEK: `RRULE:FREQ=WEEKLY;COUNT=${RRULE_COUNT_WEEKS};INTERVAL=1;BYDAY=${RRULE_WEEK_START}`,
  WEEKS_2: `RRULE:FREQ=WEEKLY;COUNT=${RRULE_COUNT_WEEKS};INTERVAL=2;BYDAY=${RRULE_WEEK_START};WKST=${RRULE_WEEK_START}`,
  WEEKS_3: `RRULE:FREQ=WEEKLY;COUNT=${RRULE_COUNT_WEEKS};INTERVAL=3;BYDAY=${RRULE_WEEK_START};WKST=${RRULE_WEEK_START}`,
  MONTH: `RRULE:FREQ=MONTHLY;COUNT=${RRULE_COUNT_MONTHS};INTERVAL=1;WKST=${RRULE_WEEK_START}`,
};
