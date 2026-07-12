import { ObjectId } from "bson";
import { useCallback, useState } from "react";
import { type Event } from "@core/types/event.contracts";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { useEventById } from "@web/events/queries/useEventById";
import { type useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

type EditGridEventDraft = Extract<GridEventDraft, { kind: "edit" }>;

const hasMultipleRecurrenceOccurrences = (
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
const getScopeDecisionRecurrenceRule = (
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

export const useDraftConfirmation = ({
  actions,
  state,
}: Omit<ReturnType<typeof useDraftContext>, "setters" | "confirmation">) => {
  const { discard, deleteEvent, submit } = actions;
  const { isInstance, isRecurrence } = actions;
  const { draft } = state;
  const isSomeday = actions.isSomeday();
  const baseEventId =
    draft?.kind === "edit" && draft.source.recurrence.kind === "occurrence"
      ? draft.source.recurrence.seriesId
      : undefined;
  const baseEvent = useEventById(baseEventId);

  const [
    isRecurrenceUpdateScopeDialogOpen,
    setRecurrenceUpdateScopeDialogOpen,
  ] = useState<boolean>(false);

  const [finalDraft, setFinalDraft] = useState<GridEventDraft | null>(null);

  const [standaloneDraft, setStandaloneDraft] = useState<GridEventDraft | null>(
    null,
  );

  const onConfirmConvertToStandalone = useCallback(() => {
    if (standaloneDraft) {
      submit(standaloneDraft, RecurringEventUpdateScope.ALL_EVENTS);
      discard();
    }

    setStandaloneDraft(null);
  }, [standaloneDraft, submit, discard]);

  const onCancelConvertToStandalone = useCallback(() => {
    setStandaloneDraft(null);
  }, []);

  const onUpdateScopeChange = useCallback(
    (applyTo: RecurringEventUpdateScope) => {
      if (finalDraft) {
        submit(finalDraft, applyTo);
      } else {
        deleteEvent(applyTo);
      }

      setFinalDraft(null);
      setRecurrenceUpdateScopeDialogOpen(false);
      discard();
    },
    [finalDraft, submit, discard, deleteEvent],
  );

  const onSubmit = useCallback(
    async (_draft: GridEventDraft) => {
      const isEditDraft = _draft.kind === "edit";
      const rule = isEditDraft
        ? getScopeDecisionRecurrenceRule(_draft, baseEvent)
        : undefined;
      const draftIsInstance =
        isEditDraft && _draft.source.recurrence.kind === "occurrence";
      const isRecurringEvent =
        isEditDraft && (isRecurrence() || draftIsInstance);
      const instanceEvent = isInstance() || draftIsInstance;
      const toStandAlone = instanceEvent && rule === null;
      const hasMultipleOccurrences = isEditDraft
        ? hasMultipleRecurrenceOccurrences(_draft.values.schedule, rule)
        : true;
      const isSingleOccurrenceInstance =
        isRecurringEvent && instanceEvent && !hasMultipleOccurrences;
      const shouldAskForUpdateScope =
        !toStandAlone &&
        isRecurringEvent &&
        (hasMultipleOccurrences || !instanceEvent);
      const applyTo =
        toStandAlone || isSingleOccurrenceInstance
          ? RecurringEventUpdateScope.ALL_EVENTS
          : RecurringEventUpdateScope.THIS_EVENT;

      if (shouldAskForUpdateScope) {
        setFinalDraft(_draft);

        return setRecurrenceUpdateScopeDialogOpen(true);
      } else if (toStandAlone) {
        // Ask the user to confirm detaching this instance from its series.
        // The confirm dialog resolves asynchronously via
        // onConfirmConvertToStandalone, so stash the draft and stop here.
        return setStandaloneDraft(_draft);
      }

      submit(_draft, applyTo);
      discard();
    },
    [submit, isRecurrence, isInstance, discard, baseEvent],
  );

  const onDelete = useCallback(async () => {
    const isRecurringEvent = isRecurrence();

    if (isRecurringEvent && !isSomeday) {
      setFinalDraft(null);

      return setRecurrenceUpdateScopeDialogOpen(true);
    } else if (isRecurringEvent && isSomeday) {
      deleteEvent(RecurringEventUpdateScope.ALL_EVENTS);

      return discard();
    }

    deleteEvent(RecurringEventUpdateScope.THIS_EVENT);
    discard();
  }, [isSomeday, deleteEvent, isRecurrence, discard]);

  return {
    isRecurrenceUpdateScopeDialogOpen,
    setRecurrenceUpdateScopeDialogOpen,
    draft,
    finalDraft,
    standaloneDraft,
    onSubmit,
    onDelete,
    onUpdateScopeChange,
    onConfirmConvertToStandalone,
    onCancelConvertToStandalone,
  };
};
