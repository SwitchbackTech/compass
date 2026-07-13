import { type Event } from "@core/types/event.contracts";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";

export type RecurringEditProjection = {
  removeIds: ReadonlySet<string>;
  upserts: readonly Event[];
};

type ProjectRecurringEditInput = {
  scope: RecurrenceScope;
  edited: Event;
  original: Event;
  seriesEvents: readonly Event[];
};

// Instances keep their own `occurrence` recurrence pointer; only content and
// priority propagate from the edit. The series base (and a standalone
// "single" edited into a series) take the edited recurrence itself.
const seriesPatch = (event: Event, edited: Event): Event => ({
  ...event,
  content: edited.content,
  priority: edited.priority,
  recurrence:
    event.recurrence.kind === "occurrence"
      ? event.recurrence
      : edited.recurrence,
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Shift every affected instance by the drag's delta so the change renders
// optimistically. Both series-wide scopes shift by the same delta; they
// differ only in which instances are affected (computed by the caller). Each
// instance shifts relative to its own time, and the dragged instance — still
// at its old time in the cache here — lands on the edited time because
// (old + (edited - original)) === edited.
const shiftEvent = (event: Event, original: Event, edited: Event): Event => {
  const startDelta = dayjs(edited.schedule.start).diff(original.schedule.start);
  const endDelta = dayjs(edited.schedule.end).diff(original.schedule.end);

  if (event.schedule.kind === "timed") {
    return {
      ...event,
      schedule: {
        ...event.schedule,
        start: dayjs(event.schedule.start)
          .add(startDelta, "milliseconds")
          .format(),
        end: dayjs(event.schedule.end).add(endDelta, "milliseconds").format(),
      } as Event["schedule"],
    };
  }

  // allDay: DateOnly strings, shifted by whole days.
  return {
    ...event,
    schedule: {
      ...event.schedule,
      start: dayjs(event.schedule.start)
        .add(Math.round(startDelta / MS_PER_DAY), "day")
        .format("YYYY-MM-DD"),
      end: dayjs(event.schedule.end)
        .add(Math.round(endDelta / MS_PER_DAY), "day")
        .format("YYYY-MM-DD"),
    } as Event["schedule"],
  };
};

const isAtOrAfter = (event: Event, cutoff: Event["schedule"]) => {
  return !dayjs(event.schedule.start).isBefore(cutoff.start);
};

export function projectRecurringEdit({
  scope,
  edited,
  original,
  seriesEvents,
}: ProjectRecurringEditInput): RecurringEditProjection {
  if (scope === "this") {
    return { removeIds: new Set(), upserts: [edited] };
  }

  const affected =
    scope === "all"
      ? seriesEvents
      : seriesEvents.filter((event) => isAtOrAfter(event, original.schedule));

  // Downgrading a series/occurrence to a standalone single event: drop every
  // other affected instance and keep only the edited one.
  if (edited.recurrence.kind === "single") {
    return {
      removeIds: new Set(
        affected.flatMap((event) => (event.id === edited.id ? [] : [event.id])),
      ),
      upserts: [edited],
    };
  }

  const upserts = affected.map((event) =>
    shiftEvent(seriesPatch(event, edited), original, edited),
  );

  return { removeIds: new Set(), upserts };
}
