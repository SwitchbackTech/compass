import { PropsWithChildren, useMemo } from "react";
import { createPortal } from "react-dom";
import { DragOverlay, useDndContext } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Categories_Event } from "@core/types/event.types";
import { DraggableDNDData } from "@web/components/DND/Draggable";
import { AllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent";
import { TimedAgendaEvent } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/TimedAgendaEvent";

export function DNDOverlay({ children }: PropsWithChildren) {
  const { active, over } = useDndContext();
  const data = (active?.data?.current ?? {}) as DraggableDNDData;
  const { type, view, event } = data;
  const isDragging = !!active?.id && active?.id === event?._id;
  const id = active?.id ?? event?._id ?? "unknown";
  const dndProps = useMemo(
    () => ({ isDragging, over, listeners: {}, id }),
    [over, isDragging, id],
  );

  const modifiers = useMemo(() => {
    switch (view) {
      case "day":
        return [restrictToVerticalAxis];
      default:
        return [];
    }
  }, [view]);

  const Overlay = useMemo(() => {
    if (!event) return children;

    switch (type) {
      case Categories_Event.TIMED:
        return <TimedAgendaEvent event={event!} dndProps={dndProps} />;
      case Categories_Event.ALLDAY:
        return <AllDayAgendaEvent event={event} dndProps={dndProps} />;
      default:
        return children;
    }
  }, [children, type, event, dndProps]);

  return createPortal(
    <DragOverlay
      modifiers={modifiers}
      dropAnimation={{ duration: 500, easing: "ease-in-out" }}
    >
      {Overlay}
    </DragOverlay>,
    document.body,
  );
}
