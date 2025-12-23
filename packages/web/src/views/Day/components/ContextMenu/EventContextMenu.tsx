import classNames from "classnames";
import {
  FloatingPortal,
  UseInteractionsReturn,
  useFloating,
} from "@floating-ui/react";
import { useObservable } from "@ngneat/use-observable";
import { useGridMaxZIndex } from "@web/common/hooks/useGridMaxZIndex";
import {
  CursorItem,
  useFloatingNodeIdAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { activeEvent$ } from "@web/store/events";
import { EventContextMenuItems } from "@web/views/Day/components/ContextMenu/EventContextMenuItems";

export function EventContextMenu({
  floating,
  interactions,
}: {
  floating: ReturnType<typeof useFloating>;
  interactions: UseInteractionsReturn;
}) {
  const [activeEvent] = useObservable(activeEvent$);
  const nodeId = useFloatingNodeIdAtCursor();
  const floatingContextOpen = floating.context.open;
  const maxZIndex = useGridMaxZIndex();
  const isOpenAtCursor = nodeId === CursorItem.EventContextMenu;
  const open = floatingContextOpen && isOpenAtCursor && !!activeEvent;

  if (!open) return null;

  return (
    <FloatingPortal>
      <ul
        {...interactions.getFloatingProps()}
        ref={floating.refs.setFloating}
        role="menu"
        className={classNames(
          "bg-bg-secondary absolute z-[1000] min-w-[160px] list-none rounded",
          "border border-gray-600 shadow-md",
        )}
        style={{
          ...floating.context.floatingStyles,
          zIndex: maxZIndex + 3,
        }}
      >
        <EventContextMenuItems />
      </ul>
    </FloatingPortal>
  );
}
