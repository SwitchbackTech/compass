import {
  type CalendarId,
  DateTimeSchema,
  EventIdSchema,
  TimeZoneSchema,
} from "@core/types/domain-primitives";
import { type Event, EventScheduleSchema } from "@core/types/event.contracts";
import { type Dayjs } from "@core/util/date/dayjs";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import { type OnboardingTourStepId } from "./onboarding.tour.steps";

/**
 * Tour steps that need visible practice events - see 06's brief: mouse
 * clicks are disabled during these (useOnboardingSandboxKeyboardOnly.ts) and
 * this module supplies the ephemeral events they target. Every other step
 * (create, save, palette, shortcuts, fork, undo, done) works against the
 * user's real calendar as-is.
 */
export const SANDBOX_STEP_IDS: ReadonlySet<OnboardingTourStepId> = new Set([
  "moveFocus",
  "editSequence",
  "targetEvent",
  "nudge",
]);

export function isSandboxStep(stepId: OnboardingTourStepId): boolean {
  return SANDBOX_STEP_IDS.has(stepId);
}

const sandboxEventId = (suffix: string) =>
  EventIdSchema.parse(`sandbox-${suffix}`);

/** 15-minute-aligned timed event at `hour:minute` on the anchor's day. */
function buildEvent(
  idSuffix: string,
  title: string,
  anchor: Dayjs,
  calendarId: CalendarId,
  timeZone: string,
  hour: number,
  minute = 0,
  durationMinutes = 30,
): Event {
  const start = anchor
    .clone()
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0);
  const end = start.clone().add(durationMinutes, "minute");

  return {
    id: sandboxEventId(idSuffix),
    calendarId,
    content: { kind: "details", title, description: "" },
    schedule: EventScheduleSchema.parse({
      kind: "timed",
      start: start.format(),
      end: end.format(),
      timeZone: TimeZoneSchema.parse(timeZone),
    }),
    recurrence: { kind: "single" },
    createdAt: DateTimeSchema.parse(start.toISOString()),
    updatedAt: null,
  };
}

/**
 * Per-step practice events, anchored to the tour's active view so they land
 * on whatever day/week is currently open. Every event is read-only except
 * nudge's, which is the one lesson that teaches a mutation.
 */
export function buildSandboxEventData(
  stepId: OnboardingTourStepId,
  anchor: Dayjs,
  calendarId: CalendarId,
  timeZone: string,
): NormalizedEventQueryData | undefined {
  if (!isSandboxStep(stepId)) return undefined;

  const build = (idSuffix: string, title: string, hour: number, minute = 0) =>
    buildEvent(idSuffix, title, anchor, calendarId, timeZone, hour, minute);

  const events: Event[] =
    stepId === "moveFocus"
      ? [
          build("moveFocus-1", "Practice: focus me", 9),
          build("moveFocus-2", "Practice: then me", 11),
          build("moveFocus-3", "Practice: and me", 14),
        ]
      : stepId === "editSequence"
        ? [build("editSequence-1", "Practice: E then T", 10)]
        : stepId === "targetEvent"
          ? [
              build("targetEvent-1", "Practice: jump here", 9, 30),
              build("targetEvent-2", "Practice: or here", 12),
              build("targetEvent-3", "Practice: or here", 15, 30),
            ]
          : [build("nudge-1", "Practice: nudge me", 13)];

  // nudge's event is deliberately left out of sandboxReadOnlyEventIds so its
  // Shift+Arrow shortcut isn't blocked by the read-only gate. The write
  // itself still safely no-ops (useUpdateEvent's findEventInCache never
  // resolves a sandbox id, since these are never written into the query
  // cache - see mergeSandboxEventData) - no error, no toast, nothing
  // persisted. Wiring a real, visible local reposition would mean touching
  // the shared grid-focus/mutation pipeline the brief calls out as needing
  // isolated review; left as a known follow-up rather than a rushed patch
  // to that code under this brief.
  const sandboxReadOnlyEventIds =
    stepId === "nudge" ? [] : events.map((event) => event.id);

  return {
    ids: events.map((event) => event.id),
    entities: Object.fromEntries(events.map((event) => [event.id, event])),
    sandboxReadOnlyEventIds,
  };
}

/**
 * Splices sandbox events into real query data. Reference-stable when there
 * is nothing to splice, so the pipeline cache in useCalendarEventViewModel
 * keeps hitting outside the tour.
 */
export function mergeSandboxEventData(
  real: NormalizedEventQueryData | undefined,
  sandbox: NormalizedEventQueryData | undefined,
): NormalizedEventQueryData | undefined {
  if (!sandbox) return real;
  if (!real) return sandbox;

  return {
    ...real,
    ids: [...real.ids, ...sandbox.ids],
    entities: { ...real.entities, ...sandbox.entities },
    sandboxReadOnlyEventIds: sandbox.sandboxReadOnlyEventIds,
  };
}
