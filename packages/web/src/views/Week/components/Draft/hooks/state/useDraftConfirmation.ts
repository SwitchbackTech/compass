import { ObjectId } from "bson";
import { useCallback, useState } from "react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

const hasMultipleRecurrenceOccurrences = (event: Schema_GridEvent): boolean => {
  const rule = event.recurrence?.rule;

  if (!Array.isArray(rule) || rule.length === 0) {
    return true;
  }

  try {
    const recurrence = new CompassEventRRule({
      _id: new ObjectId(),
      startDate: event.startDate,
      endDate: event.endDate,
      recurrence: { rule },
    });

    return recurrence.all((_, index) => index < 2).length > 1;
  } catch {
    return true;
  }
};

export const useDraftConfirmation = ({
  actions,
  state,
}: Omit<ReturnType<typeof useDraftContext>, "setters" | "confirmation">) => {
  const { discard, deleteEvent, submit } = actions;
  const { isInstance, isRecurrence } = actions;
  const { draft } = state;
  const isSomeday = actions.isSomeday();

  const [
    isRecurrenceUpdateScopeDialogOpen,
    setRecurrenceUpdateScopeDialogOpen,
  ] = useState<boolean>(false);

  const [finalDraft, setFinalDraft] = useState<Schema_GridEvent | null>(null);

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
    async (_draft: Schema_GridEvent) => {
      const rule = _draft.recurrence?.rule;
      const draftIsInstance = ObjectId.isValid(
        _draft.recurrence?.eventId ?? "",
      );
      const draftIsRecurring = Array.isArray(rule) || draftIsInstance;
      const isExistingDraft = Boolean(_draft._id) || draftIsInstance;
      const isRecurringEvent =
        isExistingDraft && (isRecurrence() || draftIsRecurring);
      const instanceEvent = isInstance() || draftIsInstance;
      const toStandAlone = instanceEvent && rule === null;
      const hasMultipleOccurrences = hasMultipleRecurrenceOccurrences(_draft);
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
        // show delete confirmation
        const confirmed = window.confirm(
          `Convert ${_draft.title || "this event"} to standalone event?`,
        );

        if (!confirmed) return;
      }

      submit(_draft, applyTo);
      discard();
    },
    [submit, isRecurrence, isInstance, discard],
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
    onSubmit,
    onDelete,
    onUpdateScopeChange,
  };
};
