import { z } from "zod/v4";
import { ValidatedCompassEventSchema } from "@core/types/compass-event.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import {
  AttendeeSchema,
  ConferenceSchema,
  OrganizerSchema,
} from "@core/types/event-attendance.contracts";
import {
  EventColorSlotSchema,
  OptionalHexEventColorSchema,
} from "@core/types/event-color.contracts";

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

const WebEventSchema = ValidatedCompassEventSchema.extend({
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
  isDemo: z.boolean().optional(),
  /** Timed event shown in the all-day row because it spans midnight. */
  isTimedMultiDayDisplay: z.boolean().optional(),
  // Optional Google-mapped event color tag. Joined like calendarId — not part
  // of CompassEvent — so cards can paint a per-event fill without widening
  // the shared core type.
  color: EventColorSlotSchema.optional(),
  // A provider custom color (e.g. a Google event label) with no Compass slot
  // equivalent. Takes precedence over `color` when both are somehow present.
  colorHex: OptionalHexEventColorSchema,
  // Read-only, provider-sourced. Joined like calendarId/color above.
  location: z.string().nullable().optional(),
  organizer: OrganizerSchema.nullable().optional(),
  attendees: z.array(AttendeeSchema).readonly().optional(),
  conference: ConferenceSchema.nullable().optional(),
});
export type GridEvent = z.infer<typeof GridEventSchema>;
