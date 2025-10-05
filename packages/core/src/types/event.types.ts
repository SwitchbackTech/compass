import { ObjectId } from "bson";
import type { Query } from "express-serve-static-core";
import { z } from "zod";
import {
  Origin,
  Priorities,
  type Priority,
} from "@core/constants/core.constants";

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
 * Event category, based on its recurrence status and isSomeday flag
 * - STANDALONE: A single event that is not recurring
 * - RECURRENCE_BASE: A base event that is the parent of a recurring series
 * - RECURRENCE_INSTANCE: An instance of a recurring event
 * - STANDALONE_SOMEDAY: A single event that is not recurring and isSomeday,
 * - RECURRENCE_BASE_SOMEDAY: A base event that is the parent of a recurring series and isSomeday,
 */
export enum Categories_Recurrence {
  STANDALONE = "STANDALONE",
  RECURRENCE_BASE = "RECURRENCE_BASE",
  RECURRENCE_INSTANCE = "RECURRENCE_INSTANCE",
  STANDALONE_SOMEDAY = "STANDALONE_SOMEDAY",
  RECURRENCE_BASE_SOMEDAY = "RECURRENCE_BASE_SOMEDAY",
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
  };
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
  extends Omit<Schema_Event, "recurrence" | "gRecurringEventId"> {
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

export enum CompassEventStatus {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
}

export const idSchema = z.string().refine(ObjectId.isValid, {
  message: "Invalid id",
});

export const eventDateSchema = z.union([
  z.string().datetime({ offset: true }),
  z.string().date(),
]);

export const CoreEventSchema = z.object({
  _id: idSchema.optional(),
  description: z.string().nullable().optional(),
  endDate: eventDateSchema,
  isAllDay: z.boolean().optional(),
  isSomeday: z.boolean().optional(),
  gEventId: z.string().optional(),
  gRecurringEventId: z.string().optional(),
  origin: z.nativeEnum(Origin),
  priority: z.nativeEnum(Priorities),
  recurrence: Recurrence.optional(),
  startDate: eventDateSchema,
  title: z.string().optional(),
  updatedAt: z.union([z.date(), z.string().datetime()]).optional(),
  user: z.string(),
});

export const CompassEventRecurrence = z.object({
  rule: z.array(z.string()),
  eventId: z.string().optional(),
});

export const EventUpdateSchema = z.object({
  description: z.string().nullable().optional(),
  priority: z.nativeEnum(Priorities).optional(),
  recurrence: z.union([
    CompassEventRecurrence.extend({ rule: z.null() }),
    CompassEventRecurrence,
  ]),
  startDate: eventDateSchema.optional(),
  endDate: eventDateSchema.optional(),
  title: z.string().optional(),
  isSomeday: z.boolean().optional(),
});

export const CompassCoreEventSchema = CoreEventSchema.extend({
  _id: idSchema,
  recurrence: CompassEventRecurrence.extend({
    rule: z.union([z.null(), z.array(z.string())]),
  }).optional(),
});

const BaseCompassEventSchema = z.object({
  status: z
    .nativeEnum(CompassEventStatus)
    .default(CompassEventStatus.CONFIRMED),
  applyTo: z
    .nativeEnum(RecurringEventUpdateScope)
    .default(RecurringEventUpdateScope.THIS_EVENT)
    .optional(),
});

export const CompassThisEventSchema = BaseCompassEventSchema.merge(
  z.object({
    applyTo: z.literal(RecurringEventUpdateScope.THIS_EVENT),
    payload: z.union([
      CompassCoreEventSchema.merge(z.object({ recurrence: z.undefined() })),
      CompassCoreEventSchema.merge(
        z.object({
          recurrence: z
            .union([
              CompassEventRecurrence.extend({ rule: z.null() }),
              CompassEventRecurrence,
            ])
            .optional(),
        }),
      ),
    ]),
  }),
);

export const CompassThisAndFollowingEventSchema = BaseCompassEventSchema.merge(
  z.object({
    applyTo: z.literal(RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS),
    payload: CompassCoreEventSchema.merge(
      z.object({ recurrence: CompassEventRecurrence }),
    ).extend({ isSomeday: z.literal(false) }),
  }),
);

export const CompassAllEventsSchema = BaseCompassEventSchema.merge(
  z.object({
    applyTo: z.literal(RecurringEventUpdateScope.ALL_EVENTS),
    payload: CompassCoreEventSchema.merge(
      z.object({ recurrence: CompassEventRecurrence }),
    ).extend({ isSomeday: z.literal(false) }),
  }),
);

export const CompassEventSchema = z.discriminatedUnion("applyTo", [
  CompassThisEventSchema,
  CompassThisAndFollowingEventSchema,
  CompassAllEventsSchema,
]);

export type Event_Core = z.infer<typeof CoreEventSchema>;
export type CompassThisEvent = z.infer<typeof CompassThisEventSchema>;
export type CompassThisAndFollowingEvent = z.infer<
  typeof CompassThisAndFollowingEventSchema
>;
export type CompassAllEvents = z.infer<typeof CompassAllEventsSchema>;
export type CompassEvent = z.infer<typeof CompassEventSchema>;
export type CompassCoreEvent = z.infer<typeof CompassCoreEventSchema>;
export type EventUpdatePayload = z.infer<typeof EventUpdateSchema>;

export type WithCompassId<T> = T & { _id: string };
export type WithMongoId<T> = T & { _id: ObjectId }; // same as WithId from the 'mongodb' package - but for ui use
export type WithoutCompassId<T> = Omit<T, "_id">;
export enum CalendarProvider {
  GOOGLE = "google",
  COMPASS = "compass",
}
