import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { getCompassEventDateFormat } from "@core/util/event/event.util";

export type RecurringEditProjection = {
  removeIds: ReadonlySet<string>;
  upserts: readonly Schema_Event[];
};

type ProjectRecurringEditInput = {
  applyTo: RecurringEventUpdateScope;
  edited: Schema_Event;
  original: Schema_Event;
  seriesEvents: readonly Schema_Event[];
};

const seriesPatch = (event: Schema_Event, edited: Schema_Event) => ({
  ...event,
  description: edited.description,
  isSomeday: edited.isSomeday,
  priority: edited.priority,
  title: edited.title,
  recurrence: event.recurrence?.eventId
    ? {
        eventId: event.recurrence.eventId,
        rule: edited.recurrence?.rule ?? event.recurrence.rule,
      }
    : event.recurrence,
});

const shiftEvent = (
  event: Schema_Event,
  original: Schema_Event,
  edited: Schema_Event,
) => {
  if (
    !event.startDate ||
    !event.endDate ||
    !original.startDate ||
    !original.endDate ||
    !edited.startDate ||
    !edited.endDate
  ) {
    return event;
  }

  const startDelta = dayjs(edited.startDate).diff(original.startDate);
  const endDelta = dayjs(edited.endDate).diff(original.endDate);
  const startFormat = getCompassEventDateFormat(event.startDate);
  const endFormat = getCompassEventDateFormat(event.endDate);

  return {
    ...event,
    startDate: dayjs(event.startDate)
      .add(startDelta, "milliseconds")
      .format(startFormat),
    endDate: dayjs(event.endDate)
      .add(endDelta, "milliseconds")
      .format(endFormat),
  };
};

const isAtOrAfter = (event: Schema_Event, cutoff?: string) =>
  Boolean(
    event.startDate && cutoff && !dayjs(event.startDate).isBefore(cutoff),
  );

export function projectRecurringEdit({
  applyTo,
  edited,
  original,
  seriesEvents,
}: ProjectRecurringEditInput): RecurringEditProjection {
  if (applyTo === RecurringEventUpdateScope.THIS_EVENT) {
    return { removeIds: new Set(), upserts: [edited] };
  }

  const affected =
    applyTo === RecurringEventUpdateScope.ALL_EVENTS
      ? seriesEvents
      : seriesEvents.filter((event) => isAtOrAfter(event, original.startDate));

  if (edited.recurrence?.rule === null) {
    return {
      removeIds: new Set(affected.flatMap(({ _id }) => (_id ? [_id] : []))),
      upserts: [{ ...edited, recurrence: undefined }],
    };
  }

  const upserts = affected.map((event) => {
    const patched = seriesPatch(event, edited);
    return applyTo === RecurringEventUpdateScope.ALL_EVENTS
      ? patched
      : shiftEvent(patched, original, edited);
  });

  return { removeIds: new Set(), upserts };
}
