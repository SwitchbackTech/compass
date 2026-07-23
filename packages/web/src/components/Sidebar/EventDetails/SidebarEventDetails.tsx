import { useCallback, useMemo } from "react";
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
import { RecurrenceScopeConfirmationDialog } from "@web/views/Forms/EventForm/RecurrenceScopeDialog";
import { EventFormPanel } from "@web/views/Forms/EventFormPanel/EventFormPanel";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

/**
 * The Day view's event-details panel, docked in the sidebar.
 * Store-driven: renders the current grid draft whenever the draft store says
 * the form is open. Week wires its own panel through DraftContext — see
 * WeekSidebarEventDetails.
 */
export function SidebarEventDetails() {
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

  const {
    onDelete: deleteEvent,
    onSubmit,
    pendingAction,
    setRecurrenceUpdateScopeDialogOpen,
    onUpdateScopeChange,
  } = useRecurrenceScopeConfirmation({
    getDeleteContext,
    getSaveContext,
    onDelete: (applyTo) => onDelete(toRecurrenceScope(applyTo)),
    onSave,
  });

  const syncDraft = useCallback((resolved: GridEventDraft | null) => {
    draftActions.setGridDraft(resolved);
  }, []);

  const scopeDialogDraft = useMemo(() => {
    if (!pendingAction || !draft) return null;

    return gridEventDraftToSchemaEvent(
      pendingAction.type === "save" ? pendingAction.draft : draft,
    );
  }, [draft, pendingAction]);

  return (
    <EventFormPanel
      confirmation={{ onDelete: deleteEvent, onSubmit }}
      confirmationUi={
        <RecurrenceScopeConfirmationDialog
          draft={scopeDialogDraft}
          pendingAction={pendingAction}
          setRecurrenceUpdateScopeDialogOpen={
            setRecurrenceUpdateScopeDialogOpen
          }
          onUpdateScopeChange={onUpdateScopeChange}
        />
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
