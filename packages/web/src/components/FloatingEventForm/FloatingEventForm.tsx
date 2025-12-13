import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { CursorItem } from "@web/common/context/open-at-cursor";
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { useMaxAgendaZIndex } from "@web/views/Day/hooks/events/useMaxAgendaZIndex";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";

export function FloatingEventForm() {
  const context = useDraftContextV2();
  const zIndex = useMaxAgendaZIndex() + 2;
  const openAtCursor = useOpenAtCursor();
  const { nodeId, floating, interactions } = openAtCursor;
  const isOpenAtCursor = nodeId === CursorItem.EventForm;
  const { draft, setNodeId, onDelete, onSave, setDraft } = context;

  if (!isOpenAtCursor || !draft) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager context={floating.context}>
        <div
          ref={floating.refs.setFloating}
          {...interactions.getFloatingProps()}
          style={{
            ...floating.context.floatingStyles,
            zIndex,
          }}
        >
          <EventForm
            event={draft}
            onClose={() => setNodeId(null)}
            onDelete={onDelete}
            onSubmit={onSave}
            setEvent={setDraft}
          />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
