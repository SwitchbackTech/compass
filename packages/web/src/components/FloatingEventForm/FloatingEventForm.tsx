import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { type Dispatch, type SetStateAction, useCallback, useState } from "react";
import { type RecurringEventUpdateScope } from "@core/types/event.types";
import {
  Z_INDEX_FLOATING_FORM,
  ZIndex,
} from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
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
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { RecurringEventUpdateScopeDialogContent } from "@web/views/Forms/EventForm/RecurrenceScopeDialog";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";
import { type useEventForm } from "@web/views/Forms/hooks/useEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

export function FloatingEventForm({
  form,
}: {
  form: ReturnType<typeof useEventForm>;
}) {
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
  const maxZIndex = useGridMaxZIndex();
  const formZIndex = Math.max(
    maxZIndex + ZIndex.LAYER_1,
    Z_INDEX_FLOATING_FORM,
  );
  const open = isFormOpen && !!draft;
  const existingEvent = useEventById(_id);
  const existing = Boolean(existingEvent);
  const needsRecurrenceScope = Boolean(
    existingEvent && existingEvent.recurrence.kind !== "single",
  );

  const setDraft: Dispatch<SetStateAction<GridEventDraft | null>> =
    useCallback(
      (next) => {
        const resolved = typeof next === "function" ? next(draft) : next;
        draftActions.setGridDraft(resolved);
      },
      [draft],
    );

  if (!open || !draft) return null;

  const closeScopeDialog = () => setPendingAction(null);
  const submitWithScope = (applyTo: RecurringEventUpdateScope) => {
    if (pendingAction?.type === "save") {
      onSave(pendingAction.draft, applyTo);
    } else if (pendingAction?.type === "delete") {
      onDelete(toRecurrenceScope(applyTo));
    }
    setPendingAction(null);
  };
  const submit = (nextDraft: GridEventDraft | null) => {
    if (nextDraft && needsRecurrenceScope) {
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
    <FloatingPortal>
      <FloatingFocusManager
        context={form.context}
        // Must stay false: this form hosts nested floating trees (e.g.
        // ActionsMenu) with their own focus managers, so the default
        // close-on-blur here would close the form while focus is still
        // moving within a child menu's separate floating tree.
        closeOnFocusOut={false}
      >
        <div
          {...form.getFloatingProps()}
          ref={form.refs.setFloating}
          className="floating-event-form"
          style={{
            ...form.floatingStyles,
            zIndex: formZIndex,
          }}
        >
          <EventForm
            draft={draft}
            isDraft={!existing}
            isExistingEvent={existing}
            onClose={onClose}
            onDelete={deleteEvent}
            onDuplicate={onDuplicate}
            onSubmit={submit}
            setDraft={setDraft}
          />
        </div>
      </FloatingFocusManager>
      {pendingAction && (
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
          title={pendingAction.type === "delete" ? "Delete events" : undefined}
        />
      )}
    </FloatingPortal>
  );
}
