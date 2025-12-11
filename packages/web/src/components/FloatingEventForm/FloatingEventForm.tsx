import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { ZIndex } from "@web/common/constants/web.constants";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";

export function FloatingEventForm() {
  const context = useDraftContextV2();
  const { isOpenAtMouse, setFloating, getFloatingProps } = context;
  const { strategy, x, y } = context;
  const { draft, closeEventForm, onDelete, onSave, setDraft } = context;

  if (!isOpenAtMouse || !draft) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager context={context.floatingContext}>
        <div
          ref={setFloating}
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
            zIndex: ZIndex.MAX,
          }}
          {...getFloatingProps()}
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
