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
        return <TimedAgendaEvent event={event!} isDragging={!!active?.id} />;
      case Categories_Event.ALLDAY:
        return (
          <AllDayAgendaEvent
            event={event}
            over={over}
            isDragging={!!active?.id}
          />
        );
      default:
        return children;
    }
  }, [children, type, event, active?.id, over]);

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
