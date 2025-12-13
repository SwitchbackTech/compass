import { FloatingPortal } from "@floating-ui/react";
import { CursorItem } from "@web/common/context/open-at-cursor";
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { BaseContextMenu } from "@web/views/Day/components/ContextMenu/BaseContextMenu";
import { EventContextMenuItems } from "@web/views/Day/components/ContextMenu/EventContextMenuItems";
import { useMaxAgendaZIndex } from "@web/views/Day/hooks/events/useMaxAgendaZIndex";

export function EventContextMenu() {
  const context = useDraftContextV2();
  const zIndex = useMaxAgendaZIndex() + 2;
  const openAtCursor = useOpenAtCursor();
  const { draft, setNodeId } = context;
  const { nodeId, floating, interactions } = openAtCursor;
  const isOpenAtCursor = nodeId === CursorItem.EventContextMenu;

  if (!isOpenAtCursor || !draft) return null;

  return (
    <FloatingPortal>
      <BaseContextMenu
        ref={floating.refs.setFloating}
        onOutsideClick={() => setNodeId(null)}
        {...interactions.getFloatingProps()}
        context={floating.context}
        style={{
          ...floating.context.floatingStyles,
          zIndex,
        }}
      >
        <EventContextMenuItems />
      </BaseContextMenu>
    </FloatingPortal>
  );
}
