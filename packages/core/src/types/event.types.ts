import { type ObjectId } from "bson";
import { z } from "zod";
import {
  Origin,
  Priorities,
  type Priority,
} from "@core/constants/core.constants";
import { IDSchema } from "@core/types/type.utils";

/**
 * Event category, based on its display type
 * - ALLDAY: An all-day event
 * - TIMED: A timed event
 */
export enum Categories_Event {
  ALLDAY = "allday",
  TIMED = "timed",
}

/**
 * Event category, based on its recurrence status
 * - STANDALONE: A regular event that is not recurring
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

export interface Schema_Event {
  _id?: string;
  allDayOrder?: number;
  description?: string | null | undefined;
  endDate?: string;
  isAllDay?: boolean;
  gEventId?: string;
  gRecurringEventId?: string;
  order?: number;
  origin?: Origin;
  priority?: Priority;
  recurrence?: {
    rule?: string[] | null;
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

const Recurrence = z.object({
  rule: z.array(z.string()).optional(),
  eventId: z.string().optional(),
});

export type Recurrence = Schema_Event_Recur_Base | Schema_Event_Recur_Instance;

export enum CompassEventStatus {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
}

export const eventDateSchema = z.union([
  z.string().datetime({ offset: true }),
  z.string().date(),
]);

export const CoreEventSchema = z.object({
  _id: IDSchema.optional(),
  description: z.string().nullable().optional(),
  endDate: eventDateSchema,
  isAllDay: z.boolean().optional(),
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
});

export const CompassCoreEventSchema = CoreEventSchema.extend({
  _id: IDSchema,
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
    payload: CompassCoreEventSchema.extend({
      recurrence: CompassEventRecurrence.optional(),
    }),
  }),
);

export const CompassThisAndFollowingEventSchema = BaseCompassEventSchema.merge(
  z.object({
    applyTo: z.literal(RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS),
    payload: CompassCoreEventSchema.extend({
      recurrence: CompassEventRecurrence,
    }),
  }),
);

export const CompassAllEventsSchema = BaseCompassEventSchema.merge(
  z.object({
    applyTo: z.literal(RecurringEventUpdateScope.ALL_EVENTS),
    payload: CompassCoreEventSchema.extend({
      recurrence: z
        .union([
          CompassEventRecurrence.extend({ rule: z.null() }),
          CompassEventRecurrence,
        ])
        .optional(),
    }),
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
