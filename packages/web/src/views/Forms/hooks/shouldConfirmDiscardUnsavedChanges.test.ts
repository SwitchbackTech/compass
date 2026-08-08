import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import {
  createGridEventDraft,
  editGridEventDraft,
} from "@web/events/grid-event-draft.adapter";
import { shouldConfirmDiscardUnsavedChanges } from "./shouldConfirmDiscardUnsavedChanges";
import { describe, expect, it } from "bun:test";

describe("shouldConfirmDiscardUnsavedChanges", () => {
  it("returns false when there is no draft", () => {
    expect(shouldConfirmDiscardUnsavedChanges(null)).toBe(false);
  });

  it("returns false for create drafts", () => {
    const draft = createGridEventDraft({
      kind: "timed",
      start: new Date("2026-05-20T09:00:00.000Z"),
      end: new Date("2026-05-20T10:00:00.000Z"),
      timeZone: "UTC",
    });
    draft.values.title = "Brand new";

    expect(shouldConfirmDiscardUnsavedChanges(draft)).toBe(false);
  });

  it("returns false for an unchanged edit draft", () => {
    const existingEvent = createMockEvent({
      id: EventIdSchema.parse("aaaaaaaaaaaaaaaaaaaaaaaa"),
      content: {
        kind: "details",
        title: "Existing Event",
        description: "",
      },
      schedule: EventScheduleSchema.parse({
        kind: "timed",
        start: "2026-05-20T14:00:00.000Z",
        end: "2026-05-20T15:00:00.000Z",
        timeZone: "UTC",
      }),
    });
    const draft = editGridEventDraft(existingEvent);
    if (!draft) throw new Error("expected an edit draft");

    expect(shouldConfirmDiscardUnsavedChanges(draft)).toBe(false);
  });

  it("returns true for a dirty edit draft", () => {
    const existingEvent = createMockEvent({
      id: EventIdSchema.parse("aaaaaaaaaaaaaaaaaaaaaaaa"),
      content: {
        kind: "details",
        title: "Existing Event",
        description: "",
      },
      schedule: EventScheduleSchema.parse({
        kind: "timed",
        start: "2026-05-20T14:00:00.000Z",
        end: "2026-05-20T15:00:00.000Z",
        timeZone: "UTC",
      }),
    });
    const draft = editGridEventDraft(existingEvent);
    if (!draft) throw new Error("expected an edit draft");
    draft.values.title = "Changed title";

    expect(shouldConfirmDiscardUnsavedChanges(draft)).toBe(true);
  });

  it("returns true when only the event color changed", () => {
    const existingEvent = createMockEvent({
      id: EventIdSchema.parse("aaaaaaaaaaaaaaaaaaaaaaaa"),
      content: {
        kind: "details",
        title: "Existing Event",
        description: "",
      },
      schedule: EventScheduleSchema.parse({
        kind: "timed",
        start: "2026-05-20T14:00:00.000Z",
        end: "2026-05-20T15:00:00.000Z",
        timeZone: "UTC",
      }),
    });
    const draft = editGridEventDraft(existingEvent);
    if (!draft) throw new Error("expected an edit draft");
    draft.values.color = "coral";

    expect(shouldConfirmDiscardUnsavedChanges(draft)).toBe(true);
  });
});
