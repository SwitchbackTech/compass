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
  const dayOnSave = useSaveEventForm();
  const dayOnDelete = useDeleteEvent(_id as string);
  const dayOnDuplicate = useDuplicateEvent(_id as string);
  const dayOnClose = useCloseEventForm();
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

  const dayConfirmation = useRecurrenceScopeConfirmation({
    getDeleteContext,
    getSaveContext,
    onDelete: (applyTo) => dayOnDelete(toRecurrenceScope(applyTo)),
    onSave: dayOnSave,
  });

  const confirmation = weekDraft?.confirmation ?? dayConfirmation;
  const onClose = weekDraft?.actions.discard ?? dayOnClose;
  const onDuplicate = weekDraft?.actions.duplicateEvent ?? dayOnDuplicate;

  const syncDraft = useCallback(
    (resolved: GridEventDraft | null) => {
      draftActions.setGridDraft(resolved);
      weekDraft?.setters.setDraft(resolved);
    },
    [weekDraft],
  );

  const scopeDialogDraft = useMemo(() => {
    if (weekDraft || !dayConfirmation.pendingAction || !draft) return null;

    return gridEventDraftToSchemaEvent(
      dayConfirmation.pendingAction.type === "save"
        ? dayConfirmation.pendingAction.draft
        : draft,
    );
  }, [dayConfirmation.pendingAction, draft, weekDraft]);

  const confirmationUi = weekDraft ? null : (
    <>
      <RecurrenceScopeConfirmationDialog
        draft={scopeDialogDraft}
        pendingAction={dayConfirmation.pendingAction}
        setRecurrenceUpdateScopeDialogOpen={
          dayConfirmation.setRecurrenceUpdateScopeDialogOpen
        }
        onUpdateScopeChange={dayConfirmation.onUpdateScopeChange}
      />
      <ConvertToStandaloneDialog
        draft={dayConfirmation.standaloneDraft}
        onCancel={dayConfirmation.onCancelConvertToStandalone}
        onConfirm={dayConfirmation.onConfirmConvertToStandalone}
      />
    </>
  );

  return (
    <EventFormPanel
      confirmation={{
        onDelete: confirmation.onDelete,
        onSubmit: confirmation.onSubmit,
      }}
      confirmationUi={confirmationUi}
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
