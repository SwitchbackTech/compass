import { ObjectId } from "bson";
import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
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
  resolveRecurrenceScopeOnSubmit,
  shouldPromptForRecurrenceScopeOnDelete,
} from "./recurrence-scope-decision";
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
  recurrence?: Extract<
    GridEventDraft,
    { kind: "edit" }
  >["source"]["recurrence"];
  liveRecurrence?: EditEventRecurrenceDraft;
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

describe("resolveRecurrenceScopeOnSubmit", () => {
  it("submits a new recurring draft without prompting", () => {
    const draft = buildCreateDraft({
      kind: "series",
      rules: ["FREQ=WEEKLY;COUNT=4"],
    });

    expect(
      resolveRecurrenceScopeOnSubmit({
        draft,
        baseEvent: null,
        isInstance: false,
        isRecurrence: false,
      }),
    ).toEqual({
      action: "submit",
      applyTo: RecurringEventUpdateScope.THIS_EVENT,
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
      resolveRecurrenceScopeOnSubmit({
        draft,
        baseEvent,
        isInstance: false,
        isRecurrence: false,
      }),
    ).toEqual({ action: "prompt" });
  });

  it("submits a single-occurrence recurring instance without prompting", () => {
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
      resolveRecurrenceScopeOnSubmit({
        draft,
        baseEvent,
        isInstance: false,
        isRecurrence: false,
      }),
    ).toEqual({
      action: "submit",
      applyTo: RecurringEventUpdateScope.ALL_EVENTS,
    });
  });
});

describe("shouldPromptForRecurrenceScopeOnDelete", () => {
  it("prompts before deleting recurring drafts", () => {
    const draft = buildEditDraft({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=4"] },
    });

    expect(shouldPromptForRecurrenceScopeOnDelete(draft)).toBe(true);
  });

  it("does not prompt before deleting standalone drafts", () => {
    const draft = buildEditDraft({ recurrence: { kind: "single" } });

    expect(shouldPromptForRecurrenceScopeOnDelete(draft)).toBe(false);
  });
});
