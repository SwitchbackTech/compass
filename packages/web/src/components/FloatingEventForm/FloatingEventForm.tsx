import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { ZIndex } from "@web/common/constants/web.constants";
import { useMousePosition } from "@web/common/hooks/useMousePosition";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";

export function FloatingEventForm() {
  const mousePosition = useMousePosition();
  const { floating, isOpenAtMouse } = mousePosition;
  const context = useDraftContextV2();
  const { draft, closeEventForm, onDelete, onSave, setDraft } = context;

  if (!floating || !isOpenAtMouse || !draft) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager context={floating.context}>
        <div
          ref={floating.refs.setFloating}
          style={{
            position: floating.strategy,
            top: floating.y ?? 0,
            left: floating.x ?? 0,
            zIndex: ZIndex.MAX,
          }}
          {...floating.getFloatingProps()}
        >
          <EventForm
            event={draft}
            onClose={closeEventForm}
            onDelete={onDelete}
            onSubmit={onSave}
            setEvent={setDraft}
          />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
