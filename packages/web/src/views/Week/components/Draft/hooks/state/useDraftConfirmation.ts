import { useCallback, useState } from "react";
import { RecurringEventUpdateScope } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { useEventById } from "@web/events/queries/useEventById";
import {
  resolveRecurrenceScopeOnSubmit,
  shouldPromptForRecurrenceScopeOnDelete,
} from "@web/events/recurrence/recurrence-scope-decision";
import { type useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

export const useDraftConfirmation = ({
  actions,
  state,
}: Omit<ReturnType<typeof useDraftContext>, "setters" | "confirmation">) => {
  const { discard, deleteEvent, submit } = actions;
  const { isInstance, isRecurrence } = actions;
  const { draft } = state;
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
      const decision = resolveRecurrenceScopeOnSubmit({
        draft: _draft,
        baseEvent,
        isInstance: isInstance(),
        isRecurrence: isRecurrence(),
      });

      if (decision.action === "prompt") {
        setFinalDraft(_draft);
        return setRecurrenceUpdateScopeDialogOpen(true);
      }

      if (decision.action === "standalone-confirm") {
        return setStandaloneDraft(_draft);
      }

      submit(_draft, decision.applyTo);
      discard();
    },
    [submit, isRecurrence, isInstance, discard, baseEvent],
  );

  const onDelete = useCallback(async () => {
    if (draft && shouldPromptForRecurrenceScopeOnDelete(draft)) {
      setFinalDraft(null);
      return setRecurrenceUpdateScopeDialogOpen(true);
    }

    deleteEvent(RecurringEventUpdateScope.THIS_EVENT);
    discard();
  }, [deleteEvent, draft, discard]);

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
