import { useCallback, useMemo } from "react";
import {
  FloatingFocusManager,
  FloatingPortal,
  UseInteractionsReturn,
  useFloating,
} from "@floating-ui/react";
import { getEntity } from "@ngneat/elf-entities";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import {
  CursorItem,
  useFloatingNodeIdAtCursor,
  useFloatingOpenAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { eventsStore, setDraft } from "@web/store/events";
import { useDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

export function FloatingEventForm({
  floating,
  interactions,
}: {
  floating: ReturnType<typeof useFloating>;
  interactions: UseInteractionsReturn;
}) {
  const draft = useDraft();
  const _id = draft?._id;
  const nodeId = useFloatingNodeIdAtCursor();
  const floatingOpenAtCursor = useFloatingOpenAtCursor();
  const onSave = useSaveEventForm();
  const onDelete = useDeleteEvent(draft?._id as string);
  const onDuplicate = useDuplicateEvent(draft?._id as string);
  const onClose = useCloseEventForm();
  const maxZIndex = useGridMaxZIndex();
  const isOpenAtCursor = nodeId === CursorItem.EventForm;
  const open = floatingOpenAtCursor && isOpenAtCursor && !!draft;
  const existing = useMemo(
    () => !!_id && !!eventsStore.query(getEntity(_id)),
    [_id],
  );

  const setEvent = useCallback(
    (
      cb:
        | ((event: Schema_Event | null) => Schema_Event | null)
        | Schema_Event
        | null,
    ) => {
      const update = typeof cb === "function" ? cb(draft) : cb;
      setDraft(update as WithCompassId<Schema_Event>);
    },
    [draft],
  );

  if (!open) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager
        context={floating.context}
        closeOnFocusOut={false}
        order={["reference"]}
      >
        <div
          {...interactions.getFloatingProps()}
          ref={floating.refs.setFloating}
          className="floating-event-form"
          style={{
            ...floating.context.floatingStyles,
            zIndex: maxZIndex + 1,
          }}
        >
          <EventForm
            event={draft}
            isDraft={true}
            isExistingEvent={existing}
            onClose={onClose}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onSubmit={onSave}
            setEvent={setEvent}
          />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
