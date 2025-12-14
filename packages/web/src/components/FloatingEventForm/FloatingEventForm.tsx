import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { CursorItem } from "@web/common/context/open-at-cursor";
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { maxAgendaZIndex$ } from "@web/common/utils/dom/grid-organization.util";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";

export function FloatingEventForm() {
  const context = useDraftContextV2();
  const zIndex = maxAgendaZIndex$.getValue() + 1;
  const openAtCursor = useOpenAtCursor();
  const { nodeId, floating, interactions, closeOpenAtCursor } = openAtCursor;
  const isOpenAtCursor = nodeId === CursorItem.EventForm;
  const { draft, onDelete, onSave, setDraft } = context;

  if (!isOpenAtCursor || !draft) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager context={floating.context}>
        <div
          {...interactions.getFloatingProps()}
          ref={floating.refs.setFloating}
          className="floating-event-form"
          style={{
            ...floating.context.floatingStyles,
            zIndex,
          }}
        >
          <EventForm
            event={draft}
            onClose={closeOpenAtCursor}
            onDelete={onDelete}
            onSubmit={onSave}
            setEvent={setDraft}
          />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
