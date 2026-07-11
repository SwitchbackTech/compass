import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { useCallback, useState } from "react";
import {
  type RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import {
  Z_INDEX_FLOATING_FORM,
  ZIndex,
} from "@web/common/constants/web.constants";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { legacyScopeToRecurrenceScope } from "@web/events/queries/event.legacy-bridge";
import { useEventById } from "@web/events/queries/useEventById";
import {
  draftActions,
  selectDraft,
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
  const draft = useDraftStore(selectDraft);
  const isFormOpen = useDraftStore(selectIsEventFormOpen);
  const _id = draft?._id;
  const [pendingAction, setPendingAction] = useState<
    { event: Schema_Event; type: "save" } | { type: "delete" } | null
  >(null);
  const onSave = useSaveEventForm();
  const onDelete = useDeleteEvent(draft?._id as string);
  const onDuplicate = useDuplicateEvent(draft?._id as string);
  const onClose = useCloseEventForm();
  const maxZIndex = useGridMaxZIndex();
  const formZIndex = Math.max(
    maxZIndex + ZIndex.LAYER_1,
    Z_INDEX_FLOATING_FORM,
  );
  const open = isFormOpen && !!draft;
  const existingEvent = useEventById(_id);
  const existing = Boolean(existingEvent);
  // TODO(packet-03-phase-3c): existingEvent is now the new `Event` contract
  // (recurrence.kind "single" | "series" | "occurrence"); this form still
  // targets the legacy Schema_Event draft shape.
  const needsRecurrenceScope = Boolean(
    existingEvent && existingEvent.recurrence.kind !== "single",
  );

  const setEvent = useCallback(
    (
      cb:
        | ((event: Schema_Event | null) => Schema_Event | null)
        | Schema_Event
        | null,
    ) => {
      const update = typeof cb === "function" ? cb(draft) : cb;
      draftActions.setEvent(update);
    },
    [draft],
  );

  if (!open) return null;

  const closeScopeDialog = () => setPendingAction(null);
  const submitWithScope = (applyTo: RecurringEventUpdateScope) => {
    if (pendingAction?.type === "save") {
      onSave(pendingAction.event, applyTo);
    } else if (pendingAction?.type === "delete") {
      onDelete(legacyScopeToRecurrenceScope(applyTo));
    }
    setPendingAction(null);
  };
  const submit = (event: Schema_Event | null) => {
    if (event && needsRecurrenceScope) {
      setPendingAction({ event, type: "save" });
      return;
    }
    onSave(event);
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
            event={draft}
            isDraft={!existing}
            isExistingEvent={existing}
            onClose={onClose}
            onDelete={deleteEvent}
            onDuplicate={onDuplicate}
            onSubmit={submit}
            setEvent={setEvent}
          />
        </div>
      </FloatingFocusManager>
      {pendingAction && (
        <RecurringEventUpdateScopeDialogContent
          draft={
            (pendingAction.type === "save"
              ? pendingAction.event
              : draft) as Schema_GridEvent | null
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
