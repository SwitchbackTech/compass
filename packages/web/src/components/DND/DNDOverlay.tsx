import { PropsWithChildren, useMemo } from "react";
import { createPortal } from "react-dom";
import { DragOverlay, useDraggable } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Categories_Event } from "@core/types/event.types";
import { DNDData } from "@web/components/DND/Draggable";
import { AgendaEvent } from "@web/views/Day/components/Agenda/Events/AgendaEvent/AgendaEvent";
import { AllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent";

export function DNDOverlay({ children }: PropsWithChildren) {
  const { active } = useDraggable({ id: "overlay-item" });
  const data = (active?.data?.current ?? {}) as DNDData;
  const { type, view, event, ...props } = data;

  const modifiers = useMemo(() => {
    switch (view) {
      case "day":
        return [restrictToVerticalAxis];
      default:
        return [];
    }
  }, [view]);

  const Overlay = useMemo(() => {
    switch (type) {
      case Categories_Event.TIMED:
        return (
          <AgendaEvent
            canvasContext={props.canvasContext}
            containerWidth={props.containerWidth}
            event={event!}
          />
        );
      case Categories_Event.ALLDAY:
        return <AllDayAgendaEvent event={event!} />;
      default:
        return children;
    }
  }, [children, type, event, props]);

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
