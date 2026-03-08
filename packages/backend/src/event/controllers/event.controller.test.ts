import { Origin, Priorities } from "@core/constants/core.constants";
import {
  CompassEventStatus,
  RecurringEventUpdateScope,
  type CompassEvent,
} from "@core/types/event.types";
import { normalizeNullableRecurrence } from "./event.controller";

const createCompassEvent = (
  applyTo: RecurringEventUpdateScope,
  recurrence: CompassEvent["payload"]["recurrence"] | null,
): CompassEvent => ({
  applyTo,
  status: CompassEventStatus.CONFIRMED,
  payload: {
    _id: "65cdb14f89d9f0f3ce95a1ba",
    startDate: "2026-03-08T09:00:00.000Z",
    endDate: "2026-03-08T10:00:00.000Z",
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
    user: "test-user",
    recurrence: recurrence as CompassEvent["payload"]["recurrence"],
  },
});

describe("normalizeNullableRecurrence", () => {
  it("converts null recurrence to { rule: null } for all-events updates", () => {
    const event = createCompassEvent(
      RecurringEventUpdateScope.ALL_EVENTS,
      null,
    );

    const result = normalizeNullableRecurrence(event);

    expect(result.payload.recurrence).toEqual({ rule: null });
  });

  it("removes null recurrence for non all-events updates", () => {
    const event = createCompassEvent(
      RecurringEventUpdateScope.THIS_EVENT,
      null,
    );

    const result = normalizeNullableRecurrence(event);

    expect(result.payload.recurrence).toBeUndefined();
  });

  it("returns original event when recurrence is not null", () => {
    const event = createCompassEvent(RecurringEventUpdateScope.THIS_EVENT, {
      rule: ["RRULE:FREQ=DAILY;COUNT=3"],
    });

    const result = normalizeNullableRecurrence(event);

    expect(result).toBe(event);
  });
});
