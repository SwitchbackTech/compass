import { ObjectId } from "mongodb";
import dayjs from "@core/util/date/dayjs";
import {
  type CalendarId,
  type DateTime,
  type EventId,
} from "@core/types/domain-primitives";
import { type Event, type EventSchedule } from "@core/types/event.contracts";
import { type CreateEventInput } from "@core/types/event-command.contracts";
import {
  type EventRecord,
  type EventScheduleRecord,
} from "@backend/event/event.record";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

const WIRE_DATETIME_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSSZ";

// The web client reads the offset embedded in this string to decide what
// wall-clock time to display, so format in the event's own timeZone instead
// of toISOString() (which always forces a UTC "Z" suffix). dayjs.tz() throws
// on an unrecognized zone, which un-migrated/corrupt records could still
// carry - fall back to the old UTC-offset behavior rather than 500ing the
// whole read.
const toWireDateTime = (date: Date, timeZone: string): DateTime => {
  try {
    return dayjs(date).tz(timeZone).format(WIRE_DATETIME_FORMAT) as DateTime;
  } catch {
    return date.toISOString() as DateTime;
  }
};

const mapScheduleRecordToSchedule = (
  schedule: EventScheduleRecord,
): EventSchedule => {
  if (schedule.kind !== "timed") return schedule;

  return {
    kind: "timed",
    start: toWireDateTime(schedule.start, schedule.timeZone),
    end: toWireDateTime(schedule.end, schedule.timeZone),
    timeZone: schedule.timeZone,
  };
};

export const mapEventRecord = (record: EventRecord): Event => ({
  id: record._id.toHexString() as EventId,
  calendarId: record.calendarId.toHexString() as CalendarId,
  content: record.content,
  schedule: mapScheduleRecordToSchedule(record.schedule),
  recurrence:
    record.recurrence.kind === "occurrence"
      ? {
          kind: "occurrence",
          seriesId: record.recurrence.seriesId.toHexString() as EventId,
        }
      : record.recurrence,
  createdAt: record.createdAt.toISOString() as DateTime,
  updatedAt: record.updatedAt
    ? (record.updatedAt.toISOString() as DateTime)
    : null,
});

export const mapCreateInput = (
  input: CreateEventInput,
  context: { now: Date },
): EventRecord => {
  const schedule: EventScheduleRecord =
    input.schedule.kind === "timed"
      ? {
          kind: "timed",
          start: new Date(input.schedule.start),
          end: new Date(input.schedule.end),
          timeZone: input.schedule.timeZone,
        }
      : input.schedule;

  return {
    _id:
      input.id && OBJECT_ID_PATTERN.test(input.id)
        ? new ObjectId(input.id)
        : new ObjectId(),
    calendarId: new ObjectId(input.calendarId),
    content: input.content,
    schedule,
    recurrence: input.recurrence,
    externalReference: null,
    createdAt: context.now,
    updatedAt: null,
  };
};
