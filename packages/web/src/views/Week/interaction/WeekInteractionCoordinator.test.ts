import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { resolveInteractionSourceEvent } from "./WeekInteractionCoordinator";
import { describe, expect, it } from "bun:test";

const createSourceEvent = (kind: "allDay" | "timed") =>
  createMockEvent({
    id: EventIdSchema.parse(
      kind === "timed"
        ? "aaaaaaaaaaaaaaaaaaaaaaaa"
        : "bbbbbbbbbbbbbbbbbbbbbbbb",
    ),
    schedule: EventScheduleSchema.parse(
      kind === "timed"
        ? {
            kind,
            start: "2026-05-20T09:00:00.000Z",
            end: "2026-05-20T10:00:00.000Z",
            timeZone: "UTC",
          }
        : {
            kind,
            start: "2026-05-20",
            end: "2026-05-21",
          },
    ),
  });

describe("resolveInteractionSourceEvent", () => {
  for (const kind of ["timed", "allDay"] as const) {
    it(`retains the ${kind} source after navigation replaces the visible week`, () => {
      const activeEvent = createSourceEvent(kind);

      expect(
        resolveInteractionSourceEvent(activeEvent.id, new Map(), activeEvent),
      ).toBe(activeEvent);
    });
  }

  it("does not reuse an active event for a different interaction", () => {
    const activeEvent = createSourceEvent("timed");

    expect(
      resolveInteractionSourceEvent(
        "cccccccccccccccccccccccc",
        new Map(),
        activeEvent,
      ),
    ).toBeUndefined();
  });
});
