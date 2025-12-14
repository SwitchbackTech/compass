import { FloatingPortal } from "@floating-ui/react";
import { CursorItem } from "@web/common/context/open-at-cursor";
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { maxAgendaZIndex$ } from "@web/common/utils/dom/grid-organization.util";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { BaseContextMenu } from "@web/views/Day/components/ContextMenu/BaseContextMenu";
import { EventContextMenuItems } from "@web/views/Day/components/ContextMenu/EventContextMenuItems";

export function EventContextMenu() {
  const context = useDraftContextV2();
  const openAtCursor = useOpenAtCursor();
  const { draft, closeOpenAtCursor } = context;
  const { nodeId, floating, interactions } = openAtCursor;
  const isOpenAtCursor = nodeId === CursorItem.EventContextMenu;

  if (!isOpenAtCursor || !draft) return null;

  return (
    <FloatingPortal>
      <BaseContextMenu
        {...interactions.getFloatingProps()}
        ref={floating.refs.setFloating}
        onOutsideClick={closeOpenAtCursor}
        context={floating.context}
        style={{
          ...floating.context.floatingStyles,
          zIndex: maxAgendaZIndex$.getValue() + 1,
        }}
      >
        <EventContextMenuItems />
      </BaseContextMenu>
    </FloatingPortal>
  );
}
