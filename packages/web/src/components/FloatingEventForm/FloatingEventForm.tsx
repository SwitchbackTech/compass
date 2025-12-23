import { useCallback } from "react";
import {
  FloatingFocusManager,
  FloatingPortal,
  UseInteractionsReturn,
  useFloating,
} from "@floating-ui/react";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import {
  CursorItem,
  useFloatingNodeIdAtCursor,
  useFloatingOpenAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { setDraft } from "@web/store/events";
import { useDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

export function FloatingEventForm({
  floating,
  interactions,
}: {
  floating: ReturnType<typeof useFloating>;
  interactions: UseInteractionsReturn;
}) {
  const draft = useDraft();
  const nodeId = useFloatingNodeIdAtCursor();
  const floatingOpenAtCursor = useFloatingOpenAtCursor();
  const onSave = useSaveEventForm();
  const onClose = useCloseEventForm();
  const maxZIndex = useGridMaxZIndex();
  const isOpenAtCursor = nodeId === CursorItem.EventForm;
  const open = floatingOpenAtCursor && isOpenAtCursor && !!draft;

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
            onClose={onClose}
            onDelete={() => {}}
            onSubmit={onSave}
            setEvent={setEvent}
          />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
