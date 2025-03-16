export interface Schema_Event {
  _id?: string;
  allDayOrder?: number;
  description?: string | null | undefined;
  endDate?: string;
  isAllDay?: boolean;
  isSomeday?: boolean;
  gEventId?: string;
  order?: number;
  origin?: Origin;
  priority?: Priority;
  recurrence?: {
    rule?: string[];
    eventId?: string;
  };
  startDate?: string;
  title?: string;
  updatedAt?: Date | string;
  user?: string;
}

/*
Signifies where an event originated from
*/
export enum Origin {
  COMPASS = 'compass',
  GOOGLE = 'google',
  GOOGLE_IMPORT = 'googleimport',
  UNSURE = 'unsure',
}

export type Priority =
  | Priorities.UNASSIGNED
  | Priorities.WORK
  | Priorities.SELF
  | Priorities.RELATIONS;

export enum Priorities {
  UNASSIGNED = 'unassigned',
  WORK = 'work',
  SELF = 'self',
  RELATIONS = 'relationships',
}
