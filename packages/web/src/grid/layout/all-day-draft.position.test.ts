import { Origin } from "@core/constants/core.constants";
import { EventIdSchema } from "@core/types/domain-primitives";
import { type GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { createGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { positionAllDayDraftEvent } from "./all-day-draft.position";
import { describe, expect, it } from "bun:test";

const createAllDayEvent = (overrides: Partial<GridEvent> = {}): GridEvent => ({
  _id: "event-1",
  endDate: "2026-05-26",
  isAllDay: true,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  startDate: "2026-05-25",
  title: "All-day event",
  user: "user-1",
  ...overrides,
});

describe("positionAllDayDraftEvent", () => {
  it("places a new all-day draft after existing same-day all-day events", () => {
    const draft = createGridEventDraft({
      kind: "allDay",
      start: new Date("2026-05-25"),
      end: new Date("2026-05-26"),
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
    const draftId = EventIdSchema.parse("0123456789abcdef01234567");
    const draft = createGridEventDraft(
      {
        kind: "allDay",
        start: new Date("2026-05-25"),
        end: new Date("2026-05-26"),
      },
      draftId,
    );

    const { activeDraftEvent } = positionAllDayDraftEvent({
      draft: {
        ...draft,
        values: { ...draft.values, title: "Editing second" },
      },
      events: [
        createAllDayEvent({
          _id: "first",
          title: "First",
        }),
        createAllDayEvent({
          _id: draftId,
          title: "Second",
        }),
      ],
    });

    expect(activeDraftEvent?.row).toBe(2);
    expect(activeDraftEvent?.title).toBe("Editing second");
  });
});
