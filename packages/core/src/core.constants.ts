export const MB_50 = 50000000; // in bytes
export const SOMEDAY_EVENTS_LIMIT = 10;
export const SURVEY_URL = "https://qot2dz1necm.typeform.com/to/YXpg6Ykp";

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
