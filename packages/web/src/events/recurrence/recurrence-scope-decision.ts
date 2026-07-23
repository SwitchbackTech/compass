import { ObjectId } from "bson";
import { type Event } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { RecurringEventUpdateScope } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";

type EditGridEventDraft = Extract<GridEventDraft, { kind: "edit" }>;

export const hasMultipleRecurrenceOccurrences = (
  schedule: { start: Date; end: Date },
  rule: string[] | null | undefined,
): boolean => {
  if (!Array.isArray(rule) || rule.length === 0) {
    return true;
  }

  try {
    const recurrence = new CompassEventRRule({
      _id: new ObjectId(),
      startDate: dayjs(schedule.start).format(),
      endDate: dayjs(schedule.end).format(),
      recurrence: { rule },
    });

    return recurrence.all((_, index) => index < 2).length > 1;
  } catch {
    return true;
  }
};

export const getScopeDecisionRecurrenceRule = (
  draft: EditGridEventDraft,
  baseEvent: Event | null | undefined,
): string[] | null | undefined => {
  const recurrence = draft.values.recurrence;

  if (recurrence.kind === "series") return recurrence.rules;
  if (recurrence.kind === "single") return null;

  if (draft.source.recurrence.kind === "series") {
    return [...draft.source.recurrence.rules];
  }

  if (draft.source.recurrence.kind === "occurrence") {
    return baseEvent?.recurrence.kind === "series"
      ? [...baseEvent.recurrence.rules]
      : undefined;
  }

  return undefined;
};

export type RecurrenceScopeSubmitDecision =
  | { action: "submit"; applyTo: RecurringEventUpdateScope }
  | { action: "prompt" }
  | { action: "standalone-confirm" };

export function resolveRecurrenceScopeOnSubmit({
  draft,
  baseEvent,
  isInstance,
  isRecurrence,
}: {
  draft: GridEventDraft;
  baseEvent: Event | null | undefined;
  isInstance: boolean;
  isRecurrence: boolean;
}): RecurrenceScopeSubmitDecision {
  if (draft.kind !== "edit") {
    return {
      action: "submit",
      applyTo: RecurringEventUpdateScope.THIS_EVENT,
    };
  }

  const rule = getScopeDecisionRecurrenceRule(draft, baseEvent);
  const draftIsInstance = draft.source.recurrence.kind === "occurrence";
  const isRecurringEvent = isRecurrence || draftIsInstance;
  const instanceEvent = isInstance || draftIsInstance;
  const toStandAlone = instanceEvent && rule === null;
  const hasMultipleOccurrences = hasMultipleRecurrenceOccurrences(
    draft.values.schedule,
    rule,
  );
  const isSingleOccurrenceInstance =
    isRecurringEvent && instanceEvent && !hasMultipleOccurrences;
  const shouldAskForUpdateScope =
    !toStandAlone &&
    isRecurringEvent &&
    (hasMultipleOccurrences || !instanceEvent);

  if (shouldAskForUpdateScope) {
    return { action: "prompt" };
  }

  if (toStandAlone) {
    return { action: "standalone-confirm" };
  }

  const applyTo =
    toStandAlone || isSingleOccurrenceInstance
      ? RecurringEventUpdateScope.ALL_EVENTS
      : RecurringEventUpdateScope.THIS_EVENT;

  return { action: "submit", applyTo };
}

export function shouldPromptForRecurrenceScopeOnDelete(
  draft: GridEventDraft,
): boolean {
  return draft.kind === "edit" && draft.source.recurrence.kind !== "single";
}
