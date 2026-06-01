import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { positionAllDayDraftEvent } from "./allDayDraftEventPosition";
import { describe, expect, it } from "bun:test";

const createAllDayEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  _id: "event-1",
  endDate: "2026-05-26",
  isAllDay: true,
  isSomeday: false,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  priority: Priorities.UNASSIGNED,
  startDate: "2026-05-25",
  title: "All-day event",
  user: "user-1",
  ...overrides,
});

describe("positionAllDayDraftEvent", () => {
  it("places a new all-day draft after existing same-day all-day events", () => {
    const draft = createAllDayEvent({
      _id: undefined,
      title: "Draft",
    });

    const { activeDraftEvent } = positionAllDayDraftEvent({
      draft,
      events: [
        createAllDayEvent({
          _id: "first",
          title: "First",
        }),
        createAllDayEvent({
          _id: "second",
          title: "Second",
        }),
      ],
    });

    expect(activeDraftEvent?.row).toBe(3);
  });

  it("replaces an existing all-day event draft before assigning rows", () => {
    const draft = createAllDayEvent({
      _id: "second",
      title: "Editing second",
    });

    const { activeDraftEvent } = positionAllDayDraftEvent({
      draft,
      events: [
        createAllDayEvent({
          _id: "first",
          title: "First",
        }),
        createAllDayEvent({
          _id: "second",
          title: "Second",
        }),
      ],
    });

    expect(activeDraftEvent?.row).toBe(2);
    expect(activeDraftEvent?.title).toBe("Editing second");
  });
});
