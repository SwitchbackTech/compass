import { useCallback, useContext, useMemo } from "react";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";
import { useEventById } from "@web/events/queries/useEventById";
import { toRecurrenceScope } from "@web/events/recurrence/recurrence-scope";
import {
  isExistingEventRecurring,
  useRecurrenceScopeConfirmation,
} from "@web/events/recurrence/useRecurrenceScopeConfirmation";
import {
  draftActions,
  selectGridDraft,
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { ConvertToStandaloneDialog } from "@web/views/Forms/EventForm/ConvertToStandaloneDialog";
import { RecurrenceScopeConfirmationDialog } from "@web/views/Forms/EventForm/RecurrenceScopeDialog";
import { EventFormPanel } from "@web/views/Forms/EventFormPanel/EventFormPanel";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";

/**
 * Store-driven event-details panel for Day and Week sidebars. Renders the
 * current grid draft whenever the draft store says the form is open.
 */
export function SidebarEventDetails() {
  const weekDraft = useContext(DraftContext);
  const draft = useDraftStore(selectGridDraft);
  const isFormOpen = useDraftStore(selectIsEventFormOpen);
  const _id = draft?.kind === "edit" ? draft.source.id : undefined;
  const onSave = useSaveEventForm();
  const onDelete = useDeleteEvent(_id as string);
  const onDuplicate = useDuplicateEvent(_id as string);
  const onClose = useCloseEventForm();
  const existingEvent = useEventById(_id);
  const existing = Boolean(existingEvent);
  const isRecurring = isExistingEventRecurring(existingEvent);

  const getSaveContext = useCallback(
    () => ({
      confirmAllRecurringEdits: true,
      isInstance: false,
      isRecurring,
    }),
    [isRecurring],
  );

  const getDeleteContext = useCallback(() => ({ isRecurring }), [isRecurring]);

  const confirmation = useRecurrenceScopeConfirmation({
    getDeleteContext,
    getSaveContext,
    onDelete: (applyTo) => onDelete(toRecurrenceScope(applyTo)),
    onSave,
  });

  const syncDraft = useCallback(
    (resolved: GridEventDraft | null) => {
      draftActions.setGridDraft(resolved);
      weekDraft?.setters.setDraft(resolved);
    },
    [weekDraft],
  );

  const scopeDialogDraft = useMemo(() => {
    if (!confirmation.pendingAction || !draft) return null;

    return gridEventDraftToSchemaEvent(
      confirmation.pendingAction.type === "save"
        ? confirmation.pendingAction.draft
        : draft,
    );
  }, [confirmation.pendingAction, draft]);

  return (
    <EventFormPanel
      confirmation={{
        onDelete: confirmation.onDelete,
        onSubmit: confirmation.onSubmit,
      }}
      confirmationUi={
        <>
          <RecurrenceScopeConfirmationDialog
            draft={scopeDialogDraft}
            pendingAction={confirmation.pendingAction}
            setRecurrenceUpdateScopeDialogOpen={
              confirmation.setRecurrenceUpdateScopeDialogOpen
            }
            onUpdateScopeChange={confirmation.onUpdateScopeChange}
          />
          <ConvertToStandaloneDialog
            draft={confirmation.standaloneDraft}
            onCancel={confirmation.onCancelConvertToStandalone}
            onConfirm={confirmation.onConfirmConvertToStandalone}
          />
        </>
      }
      draft={draft}
      isDraft={!existing}
      isExistingEvent={existing}
      isFormOpen={isFormOpen}
      onClose={onClose}
      onDuplicate={onDuplicate}
      syncDraft={syncDraft}
    />
  );
}
