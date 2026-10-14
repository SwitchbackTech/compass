import { act } from "react";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { deriveCalendarEventViewModel } from "@web/events/queries/event.view-model";
import {
  resetEffectiveTimeZoneStoreForTests,
  setPinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { afterEach, describe, expect, it } from "bun:test";

const denver = "America/Denver";

afterEach(() => {
  act(() => resetEffectiveTimeZoneStoreForTests());
});

describe("event.view-model DST display", () => {
  it("re-anchors timed start/end to the schedule zone after fall-back", () => {
    act(() => setPinnedTimeZone(denver));

    const schedule = EventScheduleSchema.parse({
      end: "2026-11-05T17:00:00.000Z",
      kind: "timed",
      start: "2026-11-05T16:00:00.000Z",
      timeZone: denver,
    });
    const event = createMockEvent({ schedule });
    const viewModel = deriveCalendarEventViewModel({
      demoEventIds: [],
      duplicateCopies: new Map(),
      entities: { [event.id]: event },
      ids: [event.id],
    });

    expect(viewModel.timedEvents[0]?.startDate).toBe(
      "2026-11-05T09:00:00-07:00",
    );
    expect(viewModel.timedEvents[0]?.endDate).toBe("2026-11-05T10:00:00-07:00");
  });
});
