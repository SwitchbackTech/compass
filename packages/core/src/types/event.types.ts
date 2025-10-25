import { ObjectId } from "bson";
import { z } from "zod/v4";
import { Origin, Priorities } from "@core/constants/core.constants";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";

/**
 * Event category, based on its recurrence status and isSomeday flag
 * - STANDALONE: A regular event that is not recurring
 * - RECURRENCE_BASE: A base event that is the parent of a recurring series
 * - RECURRENCE_INSTANCE: An instance of a recurring event
 * - STANDALONE_SOMEDAY: A regular someday event that is not recurring
 * - RECURRENCE_BASE_SOMEDAY: A base someday event that is the parent of a recurring series
 * - RECURRENCE_INSTANCE_SOMEDAY: An instance of a someday recurring event
 */
export enum Categories_Recurrence {
  STANDALONE = "STANDALONE",
  RECURRENCE_BASE = "RECURRENCE_BASE",
  RECURRENCE_INSTANCE = "RECURRENCE_INSTANCE",
  STANDALONE_SOMEDAY = "STANDALONE_SOMEDAY",
  RECURRENCE_BASE_SOMEDAY = "RECURRENCE_BASE_SOMEDAY",
  RECURRENCE_INSTANCE_SOMEDAY = "RECURRENCE_INSTANCE_SOMEDAY",
}

export enum EventStatus {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
}

export type TransitionCategoriesRecurrence =
  `${Categories_Recurrence}_${EventStatus}`;

/**
 * Scope of application for changes made to recurring event instances
 */
export enum RecurringEventUpdateScope {
  THIS_EVENT = "This Event",
  THIS_AND_FOLLOWING_EVENTS = "This and Following Events",
  ALL_EVENTS = "All Events",
}

export interface Params_DeleteMany {
  key: string;
  ids: ObjectId[];
}

export interface Result_DeleteMany {
  deletedCount: number;
  errors: unknown[];
}

export type Ids_Event = "_id" | "gEventId" | "gRecurringEventId";

export const StandaloneEventMetadataSchema = z.object({
  id: StringV4Schema,
});

export const InstanceEventMetadataSchema = z
  .object({
    id: StringV4Schema,
    recurringEventId: StringV4Schema,
  })
  .check(({ value, issues }) => {
    const valid = new RegExp(
      `^${value.recurringEventId}_\\d+(T\\d+Z?)?$`,
      "i",
    ).test(value.id);

    if (!valid) {
      issues.push({
        code: "invalid_value",
        input: value,
        message: "Invalid instance id",
        values: [],
      });
    }
  });

// order matters: try to match recurring first
export const EventMetadataSchema = z.union([
  InstanceEventMetadataSchema,
  StandaloneEventMetadataSchema,
]);

export const RecurrenceRuleSchema = z.array(StringV4Schema).nonempty();

export const RecurrenceBaseSchema = z.object({
  rule: RecurrenceRuleSchema,
});

export const RecurrenceInstanceSchema = z.object({
  ...RecurrenceBaseSchema.shape,
  eventId: zObjectId,
});

// order matters: try to match instance first
export const RecurrenceSchema = z.union([
  RecurrenceInstanceSchema,
  RecurrenceBaseSchema,
]);

export const PrioritiesSchema = z
  .enum(Priorities)
  .optional()
  .default(Priorities.UNASSIGNED);

export const EventSchema = z.object({
  _id: zObjectId.optional().default(() => new ObjectId()),
  calendar: zObjectId,
  title: z.string().optional().default(""),
  description: z.string().default(""),
  isSomeday: z.boolean().optional().default(false),
  startDate: z.date(),
  endDate: z.date(),
  order: z.int().min(0).optional().default(0),
  origin: z.enum(Origin).optional().default(Origin.COMPASS),
  priority: PrioritiesSchema,
  createdAt: z
    .date()
    .optional()
    .default(() => new Date()),
  updatedAt: z.date().nullable().optional(),
  recurrence: RecurrenceSchema.nullable().optional(),
  metadata: EventMetadataSchema.nullable().optional(),
});

export const EditableEventFieldsSchema = EventSchema.pick({
  description: true,
  priority: true,
  recurrence: true,
  startDate: true,
  endDate: true,
  title: true,
  isSomeday: true,
  order: true,
  updatedAt: true,
}).partial({
  description: true,
  priority: true,
  startDate: true,
  endDate: true,
  title: true,
  isSomeday: true,
  order: true,
  updatedAt: true,
});

export const ExtendedEventPropertiesSchema = EventSchema.pick({
  priority: true,
  origin: true,
});

export const RegularEventSchema = EventSchema.omit({
  recurrence: true,
}).extend({
  metadata: StandaloneEventMetadataSchema.nullable().optional(),
});

export const BaseEventSchema = RegularEventSchema.extend({
  recurrence: RecurrenceBaseSchema,
});

export const InstanceEventSchema = EventSchema.extend({
  metadata: InstanceEventMetadataSchema.nullable().optional(),
  recurrence: RecurrenceInstanceSchema,
});

export const ThisEventUpdateSchema = z.object({
  calendar: CompassCalendarSchema,
  providerSync: z.boolean().optional().default(true),
  status: z.enum(EventStatus).optional().default(EventStatus.CONFIRMED),
  applyTo: z.literal(RecurringEventUpdateScope.THIS_EVENT),
  payload: EventSchema,
});

export const ThisAndFollowingEventsUpdateSchema = ThisEventUpdateSchema.extend({
  applyTo: z.literal(RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS),
  payload: EventSchema.extend({
    isSomeday: z.literal(false),
    recurrence: RecurrenceInstanceSchema,
  }),
});

export const AllEventsUpdateSchema = ThisEventUpdateSchema.extend({
  applyTo: z.literal(RecurringEventUpdateScope.ALL_EVENTS),
  payload: EventSchema.extend({
    recurrence: z
      .union([
        RecurrenceInstanceSchema.extend({ rule: z.null() }),
        RecurrenceInstanceSchema,
      ])
      .optional(),
  }),
});

export const EventUpdateSchema = z.discriminatedUnion("applyTo", [
  ThisEventUpdateSchema,
  ThisAndFollowingEventsUpdateSchema,
  AllEventsUpdateSchema,
]);

export type ExtendedEventProperties = z.infer<
  typeof ExtendedEventPropertiesSchema
>;
export type StandaloneEventMetadata = z.infer<
  typeof StandaloneEventMetadataSchema
>;
export type InstanceEventMetadata = z.infer<typeof InstanceEventMetadataSchema>;
export type EventMetadata = z.infer<typeof EventMetadataSchema>;
export type Schema_Event = z.infer<typeof EventSchema>;
export type Schema_Regular_Event = z.infer<typeof RegularEventSchema>;
export type Schema_Base_Event = z.infer<typeof BaseEventSchema>;
export type Schema_Instance_Event = z.infer<typeof InstanceEventSchema>;
export type EditableEventFields = z.infer<typeof EditableEventFieldsSchema>;
export type EventUpdate = z.infer<typeof EventUpdateSchema>;
export type ThisEventUpdate = z.infer<typeof ThisEventUpdateSchema>;
export type AllEventsUpdate = z.infer<typeof AllEventsUpdateSchema>;
export type ThisAndFollowingEventsUpdate = z.infer<
  typeof ThisAndFollowingEventsUpdateSchema
>;
