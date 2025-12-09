import React from "react";
import { FloatingContext } from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { BaseContextMenu } from "@web/views/Day/components/ContextMenu/BaseContextMenu";
import { EventContextMenuItems } from "@web/views/Day/components/ContextMenu/EventContextMenuItems";

interface EventContextMenuProps {
  event: Schema_Event;
  onOutsideClick: () => void;
  close: () => void;
  style: React.CSSProperties;
  context: FloatingContext;
}

export const EventContextMenu = React.forwardRef<
  HTMLUListElement,
  EventContextMenuProps
>(({ event, onOutsideClick, close, style, context }, ref) => {
  return (
    <BaseContextMenu
      ref={ref}
      onOutsideClick={onOutsideClick}
      style={style}
      context={context}
    >
      <EventContextMenuItems event={event} close={close} />
    </BaseContextMenu>
  );
});

EventContextMenu.displayName = "EventContextMenu";
