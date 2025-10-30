import { ObjectId } from "bson";
import { z } from "zod/v4";
import { Origin, Priorities } from "@core/constants/core.constants";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";

// @deprecated: use EventSchema instead
export const V0EventSchema = z.object({
  _id: zObjectId.optional(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  isSomeday: z.boolean().optional(),
  startDate: z.string().nonempty().min(10),
  endDate: z.string().nonempty().min(10),
  order: z.number().optional(),
  origin: z.enum(Origin),
  priority: z.enum(Priorities),
  updatedAt: z.union([z.date(), z.string().nonempty().min(10)]).optional(),
  isAllDay: z.boolean().optional(),
  gEventId: z.string().optional(),
  gRecurringEventId: z.string().optional(),
  user: z.string(),
  recurrence: z
    .object({
      rule: z.array(z.string()).nonempty().optional(),
      eventId: z.string().optional(),
    })
    .optional(),
});

/**
 * Event category, based on its recurrence status and isSomeday flag
 * - REGULAR: A regular event that is not recurring
 * - RECURRENCE_BASE: A base event that is the parent of a recurring series
 * - RECURRENCE_INSTANCE: An instance of a recurring event
 * - REGULAR_SOMEDAY: A regular someday event that is not recurring
 * - RECURRENCE_BASE_SOMEDAY: A base someday event that is the parent of a recurring series
 * - RECURRENCE_INSTANCE_SOMEDAY: An instance of a someday recurring event
 */
export enum Categories_Recurrence {
  REGULAR = "REGULAR",
  RECURRENCE_BASE = "RECURRENCE_BASE",
  RECURRENCE_INSTANCE = "RECURRENCE_INSTANCE",
  REGULAR_SOMEDAY = "REGULAR_SOMEDAY",
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
    // review check to be provider neutral in multi-provider scenario
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

export const RecurrenceSchema = z.object({
  rule: RecurrenceRuleSchema,
  eventId: zObjectId,
});

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
  originalStartDate: z.date().optional().readonly(),
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
  originalStartDate: true,
})
  .extend({
    metadata: StandaloneEventMetadataSchema.nullable().optional(),
  })
  .check(({ value, issues }) => {
    const valid = !("recurrence" in value);

    if (!valid) {
      issues.push({
        code: "invalid_value",
        input: value,
        message: "invalid regular event",
        values: [],
      });
    }
  });

export const BaseEventSchema = RegularEventSchema.extend({
  recurrence: RecurrenceSchema,
}).check(({ value, issues }) => {
  // review check to have eventId equal to _id
  const valid = value.recurrence.eventId.equals(value._id);

  if (!valid) {
    issues.push({
      code: "invalid_value",
      input: value,
      message: "recurrence event id mismatch",
      values: [],
    });
  }
});

export const InstanceEventSchema = EventSchema.extend({
  originalStartDate: z.date().readonly(),
  metadata: InstanceEventMetadataSchema.nullable().optional(),
  recurrence: RecurrenceSchema,
}).check(({ value, issues }) => {
  // review check to have eventId not equal to _id
  const valid = !value.recurrence.eventId.equals(value._id);

  if (!valid) {
    issues.push({
      code: "invalid_value",
      input: value,
      message: "invalid recurrence event id",
      values: [],
    });
  }
});

export const SomedayEventSchema = EventSchema.extend({
  isSomeday: z.literal(true),
});

export const CalendarEventSchema = EventSchema.extend({
  isSomeday: z.literal(false),
});

export const DBEventSchema = z.union([
  RegularEventSchema,
  BaseEventSchema,
  InstanceEventSchema,
]);

export const ThisEventUpdateSchema = z.object({
  calendar: CompassCalendarSchema,
  providerSync: z.boolean().optional().default(true),
  status: z.enum(EventStatus).optional().default(EventStatus.CONFIRMED),
  applyTo: z.literal(RecurringEventUpdateScope.THIS_EVENT),
  payload: EventSchema,
});

export const ThisAndFollowingEventsUpdateSchema = ThisEventUpdateSchema.extend({
  applyTo: z.literal(RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS),
  payload: z.union([BaseEventSchema, InstanceEventSchema]),
});

export const AllEventsUpdateSchema = ThisEventUpdateSchema.extend({
  applyTo: z.literal(RecurringEventUpdateScope.ALL_EVENTS),
  payload: z.union([BaseEventSchema, InstanceEventSchema]),
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
export type Schema_SomedayEvent = z.infer<typeof SomedayEventSchema>;
export type Schema_CalendarEvent = z.infer<typeof CalendarEventSchema>;
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
