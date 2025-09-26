import { useCallback, useMemo, useState } from "react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { useDraftContext } from "@web/views/Calendar/components/Draft/context/useDraftContext";

export const useDraftConfirmation = ({
  actions,
  state,
}: Omit<ReturnType<typeof useDraftContext>, "setters" | "confirmation">) => {
  const { discard, deleteEvent, submit } = actions;
  const { isRecurrenceChanged } = actions;
  const { isInstance, isRecurrence } = actions;
  const { draft } = state;

  const recurrenceChanged = useMemo(
    () => isRecurrenceChanged(draft!),
    [draft, isRecurrenceChanged],
  );

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
    [finalDraft, submit, setFinalDraft, discard, deleteEvent],
  );

  const onSubmit = useCallback(
    async (_draft: Schema_GridEvent) => {
      const rule = _draft.recurrence?.rule;
      const isRecurringEvent = isRecurrence();
      const instanceEvent = isInstance();
      const toStandAlone = instanceEvent && rule === null;

      if (!toStandAlone && isRecurringEvent) {
        setFinalDraft(_draft);

        return setRecurrenceUpdateScopeDialogOpen(true);
      } else if (toStandAlone) {
        // show delete confirmation
        const confirmed = window.confirm(
          `Convert ${_draft.title || "this event"} to standalone event?`,
        );

        if (!confirmed) return;
      }

      submit(_draft);
      discard();
    },
    [
      submit,
      setRecurrenceUpdateScopeDialogOpen,
      setFinalDraft,
      isRecurrence,
      isInstance,
      discard,
    ],
  );

  const onDelete = useCallback(async () => {
    const isRecurringEvent = isRecurrence();

    if (isRecurringEvent) {
      setFinalDraft(null);

      return setRecurrenceUpdateScopeDialogOpen(true);
    }

    deleteEvent();
    discard();
  }, [
    setRecurrenceUpdateScopeDialogOpen,
    setFinalDraft,
    deleteEvent,
    isRecurrence,
    discard,
  ]);

  return {
    isRecurrenceUpdateScopeDialogOpen,
    setRecurrenceUpdateScopeDialogOpen,
    draft,
    recurrenceChanged,
    finalDraft,
    onSubmit,
    onDelete,
    onUpdateScopeChange,
  };
};
