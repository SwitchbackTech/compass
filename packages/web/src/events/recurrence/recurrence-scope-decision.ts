import { ObjectId } from "bson";
import { type Event } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { RecurringEventUpdateScope } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";

type EditGridEventDraft = Extract<GridEventDraft, { kind: "edit" }>;

export type RecurrenceScopeDecision =
  | { kind: "prompt" }
  | { kind: "apply"; scope: RecurringEventUpdateScope }
  | { kind: "convertToStandalone" };

export type ResolveRecurrenceScopeSaveInput = {
  action: "save";
  draft: GridEventDraft;
  baseEvent?: Event | null;
  isRecurring: boolean;
  isInstance: boolean;
  /**
   * Day view always prompts before saving any edit to an existing recurring
   * event. Week view applies occurrence-count and instance heuristics instead.
   */
  confirmAllRecurringEdits?: boolean;
};

export type ResolveRecurrenceScopeDeleteInput = {
  action: "delete";
  isRecurring: boolean;
};

export type ResolveRecurrenceScopeDecisionInput =
  | ResolveRecurrenceScopeSaveInput
  | ResolveRecurrenceScopeDeleteInput;

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

// Returns the recurrence rule that should decide the update-scope prompt:
// an explicit "series"/"single" choice on the draft (the user toggled
// recurrence in the form) always wins; otherwise ("preserve") falls back to
// the source event's own rule, or — for an occurrence with no rule of its
// own — the loaded series base's rule.
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

export const resolveRecurrenceScopeDecision = (
  input: ResolveRecurrenceScopeDecisionInput,
): RecurrenceScopeDecision => {
  if (input.action === "delete") {
    return { kind: "apply", scope: RecurringEventUpdateScope.THIS_EVENT };
  }

  const {
    draft,
    baseEvent,
    isRecurring,
    isInstance,
    confirmAllRecurringEdits = false,
  } = input;

  if (draft.kind !== "edit") {
    return { kind: "apply", scope: RecurringEventUpdateScope.THIS_EVENT };
  }

  // Ordinary occurrence changes stay in flow: apply to this instance now and
  // let the live toast promote the exact mutation to following/all. An
  // explicit recurrence edit remains structural, so it keeps the existing
  // scope chooser below — "this" is not a valid rule-change operation.
  if (
    isRecurring &&
    isInstance &&
    draft.values.recurrence.kind === "preserve"
  ) {
    return { kind: "apply", scope: RecurringEventUpdateScope.THIS_EVENT };
  }

  if (confirmAllRecurringEdits && isRecurring) return { kind: "prompt" };

  const rule = getScopeDecisionRecurrenceRule(draft, baseEvent);
  const toStandAlone = isInstance && rule === null;
  const hasMultipleOccurrences = hasMultipleRecurrenceOccurrences(
    draft.values.schedule,
    rule,
  );
  const isSingleOccurrenceInstance =
    isRecurring && isInstance && !hasMultipleOccurrences;
  const shouldAskForUpdateScope =
    !toStandAlone && isRecurring && (hasMultipleOccurrences || !isInstance);

  if (shouldAskForUpdateScope) {
    return { kind: "prompt" };
  }

  if (toStandAlone) {
    return { kind: "convertToStandalone" };
  }

  const scope = isSingleOccurrenceInstance
    ? RecurringEventUpdateScope.ALL_EVENTS
    : RecurringEventUpdateScope.THIS_EVENT;

  return { kind: "apply", scope };
};

export const isExistingEventRecurring = (event: Event | null | undefined) =>
  Boolean(event && event.recurrence.kind !== "single");
