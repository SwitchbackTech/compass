import dayjs from "@core/util/date/dayjs";
import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import { Categories_Event } from "@web/common/types/web.event.types";
import { createGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { useDraftStore } from "@web/events/stores/draft.store";
import { assembleDefaultEvent } from "../event/event.util";
import {
  createAlldayDraft,
  createTimedDraft,
  getDraftContainer,
} from "./draft.util";
import {
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";

const expectSameTime = (actual: string, expected: string) => {
  expect(dayjs(actual).isSame(dayjs(expected))).toBe(true);
};

describe("assembleDefaultEvent", () => {
  it("uses a provided end date for all-day drafts", async () => {
    const event = await assembleDefaultEvent(
      Categories_Event.ALLDAY,
      "2024-01-01",
      "2024-01-02",
    );

    expect(event).toHaveProperty("startDate", "2024-01-01");
    expect(event).toHaveProperty("endDate", "2024-01-02");
  });
});

describe("shortcut draft creation", () => {
  it("creates a one-day all-day draft on today when today is inside the visible week", async () => {
    setSystemTime(new Date("2026-05-20T10:07:00.000Z"));

    await createAlldayDraft(
      dayjs("2026-05-18T00:00:00.000Z"),
      dayjs("2026-05-24T23:59:59.999Z"),
      "createShortcut",
    );

    const { event, status } = useDraftStore.getState();

    expect(status?.eventType).toBe(Categories_Event.ALLDAY);
    expectSameTime(event?.startDate as string, "2026-05-20T00:00:00.000Z");
    expectSameTime(event?.endDate as string, "2026-05-21T00:00:00.000Z");
  });

  it("creates a one-day all-day draft on the visible week anchor when today is outside the visible week", async () => {
    setSystemTime(new Date("2026-05-20T10:07:00.000Z"));

    await createAlldayDraft(
      dayjs("2026-06-01T00:00:00.000Z"),
      dayjs("2026-06-07T23:59:59.999Z"),
      "createShortcut",
    );

    const { event, status } = useDraftStore.getState();

    expect(status?.eventType).toBe(Categories_Event.ALLDAY);
    expectSameTime(event?.startDate as string, "2026-06-01T00:00:00.000Z");
    expectSameTime(event?.endDate as string, "2026-06-02T00:00:00.000Z");
  });

  it("creates timed drafts on the visible week anchor when today is outside the visible week", async () => {
    setSystemTime(new Date("2026-05-20T10:07:00.000Z"));

    await createTimedDraft(
      false,
      dayjs("2026-06-01T00:00:00.000Z"),
      "createShortcut",
    );

    const { event, status } = useDraftStore.getState();

    expect(status?.eventType).toBe(Categories_Event.TIMED);
    expectSameTime(event?.startDate as string, "2026-06-01T10:15:00.000Z");
    expectSameTime(event?.endDate as string, "2026-06-01T11:15:00.000Z");
  });
});

describe("getDraftContainer", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("uses the draft's live schedule instead of its original event category", () => {
    const timedContainer = document.createElement("div");
    timedContainer.id = ID_GRID_EVENTS_TIMED;
    const allDayContainer = document.createElement("div");
    allDayContainer.id = ID_GRID_EVENTS_ALLDAY;
    document.body.append(timedContainer, allDayContainer);

    const draft = createGridEventDraft({
      kind: "allDay",
      start: new Date("2026-05-20T00:00:00.000Z"),
      end: new Date("2026-05-21T00:00:00.000Z"),
    });

    expect(getDraftContainer(draft)).toBe(allDayContainer);
  });
});

afterAll(() => {
  setSystemTime();
});
