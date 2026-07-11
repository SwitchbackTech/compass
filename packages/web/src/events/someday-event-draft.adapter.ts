import { Priorities } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { type NewEventDraft } from "@web/events/event-draft.types";

// Mirrors grid-event-draft.adapter.ts's createGridEventDraft/
// duplicateGridEventDraft, but for someday drafts, which use the generic
// EventDraft/EventScheduleDraft ("someday" is a variant GridScheduleDraft
// deliberately excludes). calendarId starts null: someday events aren't
// calendar-scoped by the user until the call site resolves a default target
// calendar, mirroring how a blank grid draft starts with no calendar picked.
export function createSomedayEventDraft(
  category: "week" | "month",
  anchorDate: Date,
  sortOrder: number,
): NewEventDraft {
  return {
    mode: "create",
    isDirty: true,
    submitError: null,
    values: {
      title: "",
      description: "",
      schedule: { kind: "someday", period: category, anchorDate, sortOrder },
      priority: Priorities.UNASSIGNED,
      calendarId: null,
      recurrence: { kind: "single" },
    },
  };
}

// A duplicate is a brand-new, standalone event: it starts from the source
// event's fields but is never linked back to it (mode "create"), so
// editing/deleting the duplicate never touches the original. Returns null for
// a non-someday source, mirroring duplicateGridEventDraft's null-return guard.
export function duplicateSomedayEventDraft(event: Event): NewEventDraft | null {
  const { schedule } = event;
  if (schedule.kind !== "someday") return null;

  return {
    mode: "create",
    isDirty: true,
    submitError: null,
    values: {
      title: event.content.kind === "details" ? event.content.title : "",
      description:
        event.content.kind === "details" ? event.content.description : "",
      schedule: {
        kind: "someday",
        period: schedule.period,
        anchorDate: new Date(schedule.anchorDate),
        sortOrder: schedule.sortOrder,
      },
      priority: event.priority,
      calendarId: null,
      recurrence: { kind: "single" },
    },
  };
}
