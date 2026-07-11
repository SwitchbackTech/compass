import { Priorities } from "@core/constants/core.constants";
import {
  type CalendarId,
  CalendarIdSchema,
  DateTimeSchema,
  EventIdSchema,
} from "@core/types/domain-primitives";
import { type Event, EventScheduleSchema } from "@core/types/event.contracts";
import { type LocalEventRecord } from "@web/common/storage/types/local-event.record";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";

const DEFAULT_CALENDAR_ID: CalendarId = CalendarIdSchema.parse(
  createObjectIdString(),
);

const DEFAULT_TIMED_SCHEDULE = EventScheduleSchema.parse({
  kind: "timed",
  start: "2026-05-05T09:00:00.000-05:00",
  end: "2026-05-05T10:00:00.000-05:00",
  timeZone: "America/Chicago",
});

/** Factory for a strict-contract `Event` (new event.contracts shape). */
export function createMockEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: EventIdSchema.parse(createObjectIdString()),
    calendarId: DEFAULT_CALENDAR_ID,
    content: { kind: "details", title: "Test Event", description: "" },
    schedule: DEFAULT_TIMED_SCHEDULE,
    recurrence: { kind: "single" },
    priority: Priorities.UNASSIGNED,
    createdAt: DateTimeSchema.parse("2026-05-01T00:00:00.000Z"),
    updatedAt: null,
    ...overrides,
  };
}

/** Factory for a `LocalEventRecord` (B13 IndexedDB row shape). */
export function createMockLocalEventRecord(
  overrides: Partial<Event> = {},
  isDemo = false,
): LocalEventRecord {
  const event = createMockEvent(overrides);
  return { version: 2, id: event.id, event, isDemo };
}
