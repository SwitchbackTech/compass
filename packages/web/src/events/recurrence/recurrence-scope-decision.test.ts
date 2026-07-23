import { ObjectId } from "bson";
import { EventIdSchema } from "@core/types/domain-primitives";
import { type Event, EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { RecurringEventUpdateScope } from "@web/common/types/web.event.types";
import {
  type EditEventRecurrenceDraft,
  type GridEventDraft,
  type NewEventRecurrenceDraft,
} from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  editGridEventDraft,
} from "@web/events/grid-event-draft.adapter";
import {
  getScopeDecisionRecurrenceRule,
  hasMultipleRecurrenceOccurrences,
  resolveRecurrenceScopeDecision,
} from "@web/events/recurrence/recurrence-scope-decision";
import { describe, expect, it } from "bun:test";

const SCHEDULE = EventScheduleSchema.parse({
  kind: "timed",
  start: "2026-05-31T10:00:00.000Z",
  end: "2026-05-31T11:00:00.000Z",
  timeZone: "UTC",
});

const buildCreateDraft = (
  recurrence: NewEventRecurrenceDraft = { kind: "single" },
): GridEventDraft => {
  const draft = createGridEventDraft({
    kind: "timed",
    start: new Date("2026-05-31T10:00:00.000Z"),
    end: new Date("2026-05-31T11:00:00.000Z"),
    timeZone: "UTC",
  });
  if (draft.kind !== "create") throw new Error("Expected a create draft");

  return { ...draft, values: { ...draft.values, recurrence } };
};

const buildEditDraft = ({
  id = "0123456789abcdef01234567",
  recurrence = { kind: "single" as const },
  liveRecurrence = { kind: "preserve" as const },
}: {
  id?: string;
  liveRecurrence?: EditEventRecurrenceDraft;
  recurrence?: Event["recurrence"];
} = {}): GridEventDraft => {
  const source = createMockEvent({
    id: EventIdSchema.parse(id),
    recurrence,
    schedule: SCHEDULE,
  });
  const draft = editGridEventDraft(source);
  if (!draft || draft.kind !== "edit")
    throw new Error("Expected an edit draft");

  return { ...draft, values: { ...draft.values, recurrence: liveRecurrence } };
};

describe("hasMultipleRecurrenceOccurrences", () => {
  it("returns false for a single-occurrence series", () => {
    const schedule = {
      start: new Date("2026-05-31T10:00:00.000Z"),
      end: new Date("2026-05-31T11:00:00.000Z"),
    };

    expect(
      hasMultipleRecurrenceOccurrences(schedule, ["RRULE:FREQ=WEEKLY;COUNT=1"]),
    ).toBe(false);
  });

  it("returns true for a multi-occurrence series", () => {
    const schedule = {
      start: new Date("2026-05-31T10:00:00.000Z"),
      end: new Date("2026-05-31T11:00:00.000Z"),
    };

    expect(
      hasMultipleRecurrenceOccurrences(schedule, ["RRULE:FREQ=WEEKLY;COUNT=4"]),
    ).toBe(true);
  });
});

describe("getScopeDecisionRecurrenceRule", () => {
  it("prefers an explicit series choice on the draft", () => {
    const draft = buildEditDraft({
      recurrence: { kind: "single" },
      liveRecurrence: { kind: "series", rules: ["FREQ=DAILY;COUNT=3"] },
    });
    if (draft.kind !== "edit") throw new Error("Expected an edit draft");

    expect(getScopeDecisionRecurrenceRule(draft, null)).toEqual([
      "FREQ=DAILY;COUNT=3",
    ]);
  });

  it("falls back to the series base rule for an occurrence", () => {
    const baseEventId = new ObjectId().toString();
    const baseEvent = createMockEvent({
      id: EventIdSchema.parse(baseEventId),
      recurrence: { kind: "series", rules: ["FREQ=WEEKLY;COUNT=4"] },
      schedule: SCHEDULE,
    });
    const draft = buildEditDraft({
      recurrence: {
        kind: "occurrence",
        seriesId: EventIdSchema.parse(baseEventId),
      },
    });
    if (draft.kind !== "edit") throw new Error("Expected an edit draft");

    expect(getScopeDecisionRecurrenceRule(draft, baseEvent)).toEqual([
      "FREQ=WEEKLY;COUNT=4",
    ]);
  });
});

describe("resolveRecurrenceScopeDecision", () => {
  describe("delete", () => {
    it("prompts before deleting recurring events", () => {
      expect(
        resolveRecurrenceScopeDecision({
          action: "delete",
          isRecurring: true,
        }),
      ).toEqual({ kind: "prompt" });
    });

    it("deletes non-recurring events immediately", () => {
      expect(
        resolveRecurrenceScopeDecision({
          action: "delete",
          isRecurring: false,
        }),
      ).toEqual({
        kind: "apply",
        scope: RecurringEventUpdateScope.THIS_EVENT,
      });
    });
  });

  describe("save (week heuristics)", () => {
    it("applies THIS_EVENT for new recurring drafts", () => {
      const draft = buildCreateDraft({
        kind: "series",
        rules: ["FREQ=WEEKLY;COUNT=4"],
      });

      expect(
        resolveRecurrenceScopeDecision({
          action: "save",
          draft,
          isInstance: false,
          isRecurring: false,
        }),
      ).toEqual({
        kind: "apply",
        scope: RecurringEventUpdateScope.THIS_EVENT,
      });
    });

    it("prompts for existing multi-occurrence recurring instances", () => {
      const baseEventId = new ObjectId().toString();
      const baseEvent = createMockEvent({
        id: EventIdSchema.parse(baseEventId),
        recurrence: { kind: "series", rules: ["FREQ=WEEKLY;COUNT=4"] },
        schedule: SCHEDULE,
      });
      const draft = buildEditDraft({
        recurrence: {
          kind: "occurrence",
          seriesId: EventIdSchema.parse(baseEventId),
        },
      });

      expect(
        resolveRecurrenceScopeDecision({
          action: "save",
          baseEvent,
          draft,
          isInstance: true,
          isRecurring: true,
        }),
      ).toEqual({ kind: "prompt" });
    });

    it("applies THIS_EVENT when a standalone draft is made recurring", () => {
      const draft = buildEditDraft({
        recurrence: { kind: "single" },
        liveRecurrence: { kind: "series", rules: ["FREQ=WEEKLY;COUNT=4"] },
      });

      expect(
        resolveRecurrenceScopeDecision({
          action: "save",
          draft,
          isInstance: false,
          isRecurring: false,
        }),
      ).toEqual({
        kind: "apply",
        scope: RecurringEventUpdateScope.THIS_EVENT,
      });
    });

    it("applies ALL_EVENTS for a single-occurrence recurring instance", () => {
      const baseEventId = new ObjectId().toString();
      const baseEvent = createMockEvent({
        id: EventIdSchema.parse(baseEventId),
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=1"] },
        schedule: SCHEDULE,
      });
      const draft = buildEditDraft({
        recurrence: {
          kind: "occurrence",
          seriesId: EventIdSchema.parse(baseEventId),
        },
      });

      expect(
        resolveRecurrenceScopeDecision({
          action: "save",
          baseEvent,
          draft,
          isInstance: true,
          isRecurring: true,
        }),
      ).toEqual({
        kind: "apply",
        scope: RecurringEventUpdateScope.ALL_EVENTS,
      });
    });

    it("asks to convert an instance to standalone when recurrence is cleared", () => {
      const baseEventId = new ObjectId().toString();
      const baseEvent = createMockEvent({
        id: EventIdSchema.parse(baseEventId),
        recurrence: { kind: "series", rules: ["FREQ=WEEKLY;COUNT=4"] },
        schedule: SCHEDULE,
      });
      const draft = buildEditDraft({
        recurrence: {
          kind: "occurrence",
          seriesId: EventIdSchema.parse(baseEventId),
        },
        liveRecurrence: { kind: "single" },
      });

      expect(
        resolveRecurrenceScopeDecision({
          action: "save",
          baseEvent,
          draft,
          isInstance: true,
          isRecurring: true,
        }),
      ).toEqual({ kind: "convertToStandalone" });
    });
  });

  describe("save (day confirm-all-recurring-edits)", () => {
    it("prompts for any existing recurring edit", () => {
      const draft = buildEditDraft({
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=4"] },
      });

      expect(
        resolveRecurrenceScopeDecision({
          action: "save",
          confirmAllRecurringEdits: true,
          draft,
          isInstance: false,
          isRecurring: true,
        }),
      ).toEqual({ kind: "prompt" });
    });

    it("applies THIS_EVENT for non-recurring edits", () => {
      const draft = buildEditDraft({ recurrence: { kind: "single" } });

      expect(
        resolveRecurrenceScopeDecision({
          action: "save",
          confirmAllRecurringEdits: true,
          draft,
          isInstance: false,
          isRecurring: false,
        }),
      ).toEqual({
        kind: "apply",
        scope: RecurringEventUpdateScope.THIS_EVENT,
      });
    });

    it("still prompts when clearing recurrence on a day recurring instance", () => {
      const baseEventId = new ObjectId().toString();
      const draft = buildEditDraft({
        recurrence: {
          kind: "occurrence",
          seriesId: EventIdSchema.parse(baseEventId),
        },
        liveRecurrence: { kind: "single" },
      });

      expect(
        resolveRecurrenceScopeDecision({
          action: "save",
          confirmAllRecurringEdits: true,
          draft,
          isInstance: true,
          isRecurring: true,
        }),
      ).toEqual({ kind: "prompt" });
    });
  });
});
