import {
  FloatingFocusManager,
  FloatingPortal,
  UseInteractionsReturn,
  useFloating,
} from "@floating-ui/react";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import {
  CursorItem,
  useFloatingNodeIdAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import {
  setDraft,
  useDraft,
} from "@web/views/Calendar/components/Draft/context/useDraft";
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
  const floatingContextOpen = floating.context.open;
  const onSave = useSaveEventForm();
  const onClose = useCloseEventForm();
  const maxZIndex = useGridMaxZIndex();
  const isOpenAtCursor = nodeId === CursorItem.EventForm;
  const open = floatingContextOpen && isOpenAtCursor && !!draft;

  if (!open) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager
        context={floating.context}
        closeOnFocusOut={false}
        outsideElementsInert
        modal
        returnFocus={false}
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
            setEvent={setDraft}
          />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
