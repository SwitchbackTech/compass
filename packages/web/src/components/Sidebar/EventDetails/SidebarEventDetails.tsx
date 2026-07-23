import { useCallback, useState } from "react";
import { type RecurringEventUpdateScope } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";
import { useEventById } from "@web/events/queries/useEventById";
import { toRecurrenceScope } from "@web/events/recurrence/recurrence-scope";
import {
  draftActions,
  selectGridDraft,
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { RecurringEventUpdateScopeDialogContent } from "@web/views/Forms/EventForm/RecurrenceScopeDialog";
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
  const [pendingAction, setPendingAction] = useState<
    { draft: GridEventDraft; type: "save" } | { type: "delete" } | null
  >(null);
  const onSave = useSaveEventForm();
  const onDelete = useDeleteEvent(_id as string);
  const onDuplicate = useDuplicateEvent(_id as string);
  const onClose = useCloseEventForm();
  const existingEvent = useEventById(_id);
  const existing = Boolean(existingEvent);
  const needsRecurrenceScope = Boolean(
    existingEvent && existingEvent.recurrence.kind !== "single",
  );

  const syncDraft = useCallback((resolved: GridEventDraft | null) => {
    draftActions.setGridDraft(resolved);
  }, []);

  const closeScopeDialog = () => setPendingAction(null);
  const submitWithScope = (applyTo: RecurringEventUpdateScope) => {
    if (pendingAction?.type === "save") {
      onSave(pendingAction.draft, applyTo);
    } else if (pendingAction?.type === "delete") {
      onDelete(toRecurrenceScope(applyTo));
    }
    setPendingAction(null);
  };
  const submit = (nextDraft: GridEventDraft) => {
    if (needsRecurrenceScope) {
      setPendingAction({ draft: nextDraft, type: "save" });
      return;
    }
    onSave(nextDraft);
  };
  const deleteEvent = () => {
    if (needsRecurrenceScope) {
      setPendingAction({ type: "delete" });
      return;
    }
    onDelete();
  };

  return (
    <EventFormPanel
      confirmation={{ onDelete: deleteEvent, onSubmit: submit }}
      confirmationUi={
        pendingAction && draft ? (
          <RecurringEventUpdateScopeDialogContent
            draft={
              pendingAction.type === "save"
                ? gridEventDraftToSchemaEvent(pendingAction.draft)
                : gridEventDraftToSchemaEvent(draft)
            }
            onUpdateScopeChange={submitWithScope}
            setRecurrenceUpdateScopeDialogOpen={(isOpen) => {
              if (!isOpen) closeScopeDialog();
            }}
            title={
              pendingAction.type === "delete" ? "Delete events" : undefined
            }
          />
        ) : null
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
