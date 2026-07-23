import { useCallback } from "react";
import { type Event } from "@core/types/event.contracts";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { useEventById } from "@web/events/queries/useEventById";
import {
  type UseRecurrenceScopeConfirmationOptions,
  useRecurrenceScopeConfirmation,
} from "@web/events/recurrence/useRecurrenceScopeConfirmation";
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

  const getSaveContext = useCallback(
    (_draft: GridEventDraft) => {
      const isEditDraft = _draft.kind === "edit";
      const draftIsInstance =
        isEditDraft && _draft.source.recurrence.kind === "occurrence";

      return {
        baseEvent: baseEvent as Event | null | undefined,
        isInstance: isInstance() || draftIsInstance,
        isRecurring: isEditDraft && (isRecurrence() || draftIsInstance),
      };
    },
    [baseEvent, isInstance, isRecurrence],
  );

  const getDeleteContext = useCallback(
    () => ({ isRecurring: isRecurrence() }),
    [isRecurrence],
  );

  const onSave = useCallback<UseRecurrenceScopeConfirmationOptions["onSave"]>(
    (nextDraft, applyTo) => {
      submit(nextDraft, applyTo);
      discard();
    },
    [discard, submit],
  );

  const onDelete = useCallback<
    UseRecurrenceScopeConfirmationOptions["onDelete"]
  >(
    (applyTo) => {
      deleteEvent(applyTo);
      discard();
    },
    [deleteEvent, discard],
  );

  const confirmation = useRecurrenceScopeConfirmation({
    getDeleteContext,
    getSaveContext,
    onDelete,
    onSave,
  });

  const onConfirmConvertToStandalone = useCallback(() => {
    confirmation.onConfirmConvertToStandalone();
    discard();
  }, [confirmation, discard]);

  return {
    ...confirmation,
    draft,
    finalDraft:
      confirmation.pendingAction?.type === "save"
        ? confirmation.pendingAction.draft
        : null,
    onConfirmConvertToStandalone,
  };
};
