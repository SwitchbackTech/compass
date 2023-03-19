import React, {
  Dispatch,
  ForwardedRef,
  forwardRef,
  MouseEvent,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { DroppableProvided, DraggableProvided } from "@hello-pangea/dnd";
import { FloatingPortal } from "@floating-ui/react";
import { useFloating } from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { Category_DragItem } from "@web/common/types/dnd.types";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";

import { SomedayEventRectangle } from "./SomedayEventRectangle";
import { StyledSomedayEvent } from "./styled";

export interface Props {
  event: Schema_Event;
  isDrafting: boolean;
  isDragging: boolean;
  onClose: () => void;
  onDraft: (event: Schema_Event) => void;
  onMigrate: (event: Schema_Event, location: "forward" | "back") => void;
  onSubmit: () => void;
  provided: DraggableProvided;
  // provided: DroppableProvided;
  setEvent: Dispatch<SetStateAction<Schema_GridEvent>>;
}

export const SomedayEvent = ({
  event,
  isDrafting,
  isDragging,
  onClose,
  onDraft,
  onMigrate,
  onSubmit,
  provided,
  setEvent,
}: Props) => {
  const { y, reference, floating, strategy } = useFloating({
    strategy: "absolute",
    placement: "right-start",
  });

  const [isFocused, setIsFocused] = useState(false);

  const [{ isDragging: isDraggingv2 }, drag, preview] = useDrag(
    () => ({
      type: Category_DragItem.EVENT_SOMEDAY,
      // only includes props that a user could change
      // while drafting
      item: () => {
        return {
          _id: event._id,
          description: event.description,
          priority: event.priority,
          order: event.order,
          title: event.title,
        };
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [event._id, event.description, event.priority, event.order, event.title]
  );

  useEffect(() => {
    // preview(getEmptyImage(), { captureDraggingState: true });
    preview(getEmptyImage());
  }, [preview]);

  return (
    <>
      {/* <div ref={drag}> */}
      <div>
        <StyledSomedayEvent
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          isDragging={isDragging}
          isDrafting={isDrafting}
          isFocused={isFocused}
          onBlur={() => setIsFocused(false)}
          onClick={(e: MouseEvent) => {
            console.log("in SE");
            e.stopPropagation();
            onDraft(event);
          }}
          onMouseUp={() => console.log("inMouseUp SSE")}
          onFocus={() => setIsFocused(true)}
          priority={event.priority}
          role="button"
          // ref={ref}
          ref={provided.innerRef}
        >
          {/* <SomedayEventRectangle event={event} onMigrate={onMigrate} /> */}
          <div ref={reference}>
            <SomedayEventRectangle event={event} onMigrate={onMigrate} />
          </div>
        </StyledSomedayEvent>
      </div>

      <FloatingPortal>
        {isDrafting && !isDragging && (
          <StyledFloatContainer
            ref={floating}
            strategy={strategy}
            top={y ?? 40}
            left={SIDEBAR_OPEN_WIDTH}
          >
            <SomedayEventForm
              event={event}
              onClose={onClose}
              onConvert={() => console.log("converting [not rly]...")}
              onSubmit={onSubmit}
              setEvent={setEvent}
            />
          </StyledFloatContainer>
        )}
      </FloatingPortal>
    </>
  );
};

//++
// export const SomedayEvent = forwardRef(_SomedayEvent);
// export const SomedayEvent = _SomedayEvent;
