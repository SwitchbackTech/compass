import { z } from "zod";
import { type CalendarId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import { CompassCoreEventSchema } from "@core/types/event.types";
import { IDSchema } from "@core/types/type.utils";
import { type SelectOption } from "@web/common/types/component.types";

const WebEventRecurrence = z.union([
  z.undefined(),
  z.object({
    rule: z.union([z.array(z.string()), z.null()]).optional(),
    eventId: z.string().optional(),
  }),
]);

const WebCoreEventSchema = CompassCoreEventSchema.extend({
  _id: IDSchema.optional(),
  recurrence: WebEventRecurrence,
  order: z.number().optional(),
});

export const GridEventSchema = WebCoreEventSchema.extend({
  hasFlipped: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  row: z.number().optional(),
  order: z.number().optional(), // allow carry over from Someday events
  position: z.object({
    isOverlapping: z.boolean(),
    totalEventsInGroup: z.number().default(1),
    widthMultiplier: z.number(), // EG: 0.5 for half width
    horizontalOrder: z.number(),
    dragOffset: z.object({ x: z.number(), y: z.number() }),
    initialX: z.number().nullable(),
    initialY: z.number().nullable(),
  }),
});

export const SomedayEventSchema = WebCoreEventSchema.extend({
  isSomeday: z.literal(true),
  order: z.number(),
});

export type Schema_WebEvent = z.infer<typeof WebCoreEventSchema>;

export type Schema_SomedayEvent = z.infer<typeof SomedayEventSchema>;

// calendarId is a plain type-level addition, not part of GridEventSchema
// itself: CalendarIdSchema (domain-primitives.ts) is a zod/v4 schema, while
// this file's schemas are all zod v3 ("zod") - z.object.extend() with a v4
// field schema mixed into a v3 shape crashes at parse time ("_parse is not a
// function"). calendarId is populated out-of-band (event.view-model.ts's
// gridEventsFrom, grid-event-draft.adapter.ts's gridEventDraftToSchemaEvent)
// rather than through GridEventSchema.parse, so it never needed to be a
// schema-validated field - only a typed one. Optional (rather than required,
// matching the strict core `Event` contract) so the legacy bridge doesn't
// have to guarantee it in every branch - card rendering degrades gracefully
// (no accent/label suffix) when it's missing.
export type Schema_GridEvent = z.infer<typeof GridEventSchema> & {
  calendarId?: CalendarId;
};

export interface Schema_OptimisticEvent extends Schema_GridEvent {
  _id: string; // We guarantee that we have an _id for optimistic events, unlike `Schema_Event`
}

export interface Schema_SelectedDates {
  startDate: Date;
  startTime: SelectOption<string>;
  endDate: Date;
  endTime: SelectOption<string>;
  isAllDay: boolean;
}
export interface Someday_EventsColumn {
  columns: {
    [key: string]: {
      id: string;
      eventIds: string[];
    };
  };
  columnOrder: string[];
  events: {
    [key: string]: Event;
  };
}

/**
 * Adds an _id property to an object shape
 * @template TSchema - The base type to add _id to.
 */
export type WithId<TSchema> = TSchema & { _id: string };
