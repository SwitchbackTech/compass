import { Query } from "express-serve-static-core";
import { z } from "zod";
import { Origin, Priorities, Priority } from "@core/constants/core.constants";

/**
 * Event category, based on its display type
 * - ALLDAY: An all-day event
 * - TIMED: A timed event
 * - SOMEDAY_WEEK: A someday event that is displayed in the sidebarWeek view
 * - SOMEDAY_MONTH: A someday event that is displayed in the sidebarMonth view
 */
export enum Categories_Event {
  ALLDAY = "allday",
  TIMED = "timed",
  SOMEDAY_WEEK = "sidebarWeek",
  SOMEDAY_MONTH = "sidebarMonth",
}

/**
 * Event category, based on its recurrence status
 * - STANDALONE: A single event that is not recurring
 * - RECURRENCE_BASE: A base event that is the parent of a recurring series
 * - RECURRENCE_INSTANCE: An instance of a recurring event
 */
export enum Categories_Recurrence {
  STANDALONE = "STANDALONE",
  RECURRENCE_BASE = "RECURRENCE_BASE",
  RECURRENCE_INSTANCE = "RECURRENCE_INSTANCE",
}

export type TransitionStatus = "CONFIRMED" | "CANCELLED";

export type TransitionCategoriesRecurrence =
  `${Categories_Recurrence}_${TransitionStatus}`;

/**
 * Scope of application for changes made to recurring event instances
 */
export enum RecurringEventUpdateScope {
  THIS_EVENT = "This Event",
  THIS_AND_FOLLOWING_EVENTS = "This and Following Events",
  ALL_EVENTS = "All Events",
}

export type Categories_Recur = "all" | "future";

export type Direction_Migrate = "forward" | "back" | "up" | "down";

export interface Params_DeleteMany {
  key: string;
  ids: string[];
}
export interface Params_Events {
  startDate: string;
  endDate: string;
  someday: boolean;
}

export interface Payload_Order {
  _id: string;
  order: number;
}

export interface Result_DeleteMany {
  deletedCount: number;
  errors: unknown[];
}

export interface Schema_Event {
  _id?: string;
  allDayOrder?: number;
  description?: string | null | undefined;
  endDate?: string;
  isAllDay?: boolean;
  isSomeday?: boolean;
  gEventId?: string;
  gRecurringEventId?: string;
  order?: number;
  origin?: Origin;
  priority?: Priority;
  recurrence?: {
    rule?: string[];
    eventId?: string;
  } | null;
  startDate?: string;
  title?: string;
  updatedAt?: Date | string;
  user?: string;
}

export type Schema_Event_Regular = Omit<
  Schema_Event,
  "recurrence" | "gRecurringEventId"
>;

export interface Schema_Event_Recur_Base
  extends Omit<Schema_Event, "recurrence"> {
  recurrence: {
    rule: string[]; // No eventId since this is the base recurring event
  };
}

export interface Schema_Event_Recur_Instance
  extends Omit<Schema_Event, "recurrence"> {
  recurrence: {
    eventId: string; // No rule since this is an instance of the recurring event
  };
}
export interface Schema_Event_Core extends Schema_Event {
  startDate: string;
  endDate: string;
  origin: Origin;
  priority: Priority;
  user: string;
}

export interface Query_Event extends Query {
  end?: string;
  someday?: string;
  start?: string;
  priorities?: string; // example: 'p1,p2,p3'
}

export interface Query_Event_Update extends Query {
  applyTo?: RecurringEventUpdateScope;
}

const Recurrence = z.object({
  rule: z.array(z.string()).optional(),
  eventId: z.string().optional(),
});

export type Recurrence = Schema_Event_Recur_Base | Schema_Event_Recur_Instance;
export type RecurrenceWithId =
  | WithCompassId<Schema_Event_Recur_Instance>
  | WithCompassId<Schema_Event_Recur_Base>;
export type RecurrenceWithoutId =
  | WithoutCompassId<Schema_Event_Recur_Instance>
  | WithoutCompassId<Schema_Event_Recur_Base>;

export const CoreEventSchema = z.object({
  _id: z.string().optional(),
  description: z.string().nullable().optional(),
  endDate: z.union([z.string().datetime({ offset: true }), z.string().date()]),
  isAllDay: z.boolean().optional(),
  isSomeday: z.boolean().optional(),
  gEventId: z.string().optional(),
  gRecurringEventId: z.string().optional(),
  origin: z.nativeEnum(Origin),
  priority: z.nativeEnum(Priorities),
  recurrence: Recurrence.optional(),
  startDate: z.union([
    z.string().datetime({ offset: true }),
    z.string().date(),
  ]),
  title: z.string().optional(),
  updatedAt: z.union([z.date(), z.string().datetime()]).optional(),
  user: z.string(),
});

export type Event_Core = z.infer<typeof CoreEventSchema>;

export type WithCompassId<T> = T & { _id: string };
export type WithoutCompassId<T> = Omit<T, "_id">;
