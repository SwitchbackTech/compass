import { ObjectId } from "mongodb";
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

const mapScheduleRecordToSchedule = (
  schedule: EventScheduleRecord,
): EventSchedule => {
  if (schedule.kind !== "timed") return schedule;

  return {
    kind: "timed",
    // BSON Dates serialize with a "Z" offset, which satisfies the
    // DateTimeSchema RFC 3339 offset requirement.
    start: schedule.start.toISOString() as DateTime,
    end: schedule.end.toISOString() as DateTime,
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
  priority: record.priority,
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
    priority: input.priority,
    externalReference: null,
    createdAt: context.now,
    updatedAt: null,
  };
};
