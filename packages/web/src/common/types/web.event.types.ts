import { z } from "zod/v4";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { ValidatedLegacyEventSchema } from "@core/types/legacy-event.contracts";
import { type SelectOption } from "@web/common/types/component.types";

/** Event category, based on its display type */
export enum Categories_Event {
  ALLDAY = "allday",
  TIMED = "timed",
}

/** Scope of application for changes made to recurring event instances */
export enum RecurringEventUpdateScope {
  THIS_EVENT = "This Event",
  THIS_AND_FOLLOWING_EVENTS = "This and Following Events",
  ALL_EVENTS = "All Events",
}

const WebEventSchema = ValidatedLegacyEventSchema.extend({
  recurrence: z
    .object({
      rule: z.array(z.string()).nullable().optional(),
      eventId: z.string().optional(),
    })
    .optional(),
  order: z.number().optional(),
});
export type WebEvent = z.infer<typeof WebEventSchema>;

export const GridEventSchema = WebEventSchema.extend({
  hasFlipped: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  row: z.number().optional(),
  position: z.object({
    isOverlapping: z.boolean(),
    totalEventsInGroup: z.number().default(1),
    widthMultiplier: z.number(), // EG: 0.5 for half width
    horizontalOrder: z.number(),
    dragOffset: z.object({ x: z.number(), y: z.number() }),
    initialX: z.number().nullable(),
    initialY: z.number().nullable(),
  }),
  // Real schema fields now that the whole chain is zod/v4 (calendarId used to
  // be a type-only intersection because a v4 field schema inside a v3 object
  // crashed at parse time). Populated by event.view-model.ts's
  // gridEventsFrom and grid-event-draft.adapter.ts's
  // gridEventDraftToSchemaEvent. Optional so the legacy bridge doesn't have
  // to guarantee it in every branch - card rendering degrades gracefully
  // (no accent/label suffix) when it's missing. isBusy backs the read-only
  // gate (packet 08 step 8) - see isEventReadOnly in
  // calendars/useCalendarLookup.ts.
  calendarId: CalendarIdSchema.optional(),
  isBusy: z.boolean().optional(),
});
export type GridEvent = z.infer<typeof GridEventSchema>;

export interface SelectedDates {
  startDate: Date;
  startTime: SelectOption<string>;
  endDate: Date;
  endTime: SelectOption<string>;
  isAllDay: boolean;
}
