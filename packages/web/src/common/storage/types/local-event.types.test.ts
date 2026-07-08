import { Origin, Priorities } from "@core/constants/core.constants";
import {
  isLocalDemoEvent,
  LOCAL_DEMO_EVENT_FIELD,
  markLocalDemoEvent,
  preserveLocalEventMarker,
} from "./local-event.types";
import { describe, expect, it } from "bun:test";

const baseEvent = {
  _id: "event-1",
  title: "User event",
  startDate: "2026-05-05T09:00:00.000Z",
  endDate: "2026-05-05T10:00:00.000Z",
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "unauthenticated",
};

describe("local-event.types", () => {
  it("marks seeded demo events as local demo events", () => {
    const marked = markLocalDemoEvent(baseEvent);

    expect(marked[LOCAL_DEMO_EVENT_FIELD]).toBe(true);
    expect(isLocalDemoEvent(marked)).toBe(true);
  });

  it("preserves a demo marker across local edits", () => {
    const existing = markLocalDemoEvent(baseEvent);
    const edited = { ...baseEvent, title: "Renamed sample" };

    expect(preserveLocalEventMarker(existing, edited)).toMatchObject({
      title: "Renamed sample",
      [LOCAL_DEMO_EVENT_FIELD]: true,
    });
  });

  it("does not add a marker to user-created events", () => {
    const edited = { ...baseEvent, title: "Real event" };

    expect(preserveLocalEventMarker(baseEvent, edited)).toEqual(edited);
  });
});
