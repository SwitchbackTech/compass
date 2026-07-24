import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";
import { ConvertToStandaloneDialog } from "@web/views/Forms/EventForm/ConvertToStandaloneDialog";
import { RecurrenceScopeConfirmationDialog } from "@web/views/Forms/EventForm/RecurrenceScopeDialog";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

export function WeekDraftScopeDialogs() {
  const {
    confirmation,
    state: { draft },
  } = useDraftContext();
  const {
    isRecurrenceUpdateScopeDialogOpen,
    onCancelConvertToStandalone,
    onConfirmConvertToStandalone,
    onUpdateScopeChange,
    pendingAction,
    setRecurrenceUpdateScopeDialogOpen,
    standaloneDraft,
  } = confirmation;

  return (
    <>
      {isRecurrenceUpdateScopeDialogOpen ? (
        <RecurrenceScopeConfirmationDialog
          draft={draft ? gridEventDraftToSchemaEvent(draft) : null}
          pendingAction={pendingAction}
          setRecurrenceUpdateScopeDialogOpen={
            setRecurrenceUpdateScopeDialogOpen
          }
          onUpdateScopeChange={onUpdateScopeChange}
        />
      ) : null}
      <ConvertToStandaloneDialog
        draft={standaloneDraft}
        onCancel={onCancelConvertToStandalone}
        onConfirm={onConfirmConvertToStandalone}
      />
    </>
  );
}
