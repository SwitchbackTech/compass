export const APP_NAME = "Compass Calendar";
export const API_URL_DEFAULT = "https://***REMOVED***";
export const MB_50 = 50000000; // in bytes
export const MS_IN_HR = 2.7777777777778e-7;
export const PORT_DEFAULT_API = 3000;
export const PORT_DEFAULT_WEB = 9080;
export const SOMEDAY_EVENTS_LIMIT = 9;

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
// export type Priority = keyof Priorities & string;

export enum Priorities {
  UNASSIGNED = "unassigned",
  WORK = "work",
  SELF = "self",
  RELATIONS = "relationships",
}
