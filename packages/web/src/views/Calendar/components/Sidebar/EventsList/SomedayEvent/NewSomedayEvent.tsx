import React, { Dispatch, SetStateAction, useState } from "react";
import { DraggableProvided } from "@hello-pangea/dnd";
import { Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { FloatingPortal, useFloating } from "@floating-ui/react";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";

import { NewStyledSomedayEvent } from "./newStyled";
import { SomedayEventRectangle } from "./SomedayEventRectangle";

export interface Props {
  event: Schema_Event;
  isDrafting: boolean;
  isDragging: boolean;
  isOverGrid: boolean;
  onClose: () => void;
  onDraft: (event: Schema_Event) => void;
  onMigrate: (event: Schema_Event, location: "forward" | "back") => void;
  onSubmit: () => void;
  provided: DraggableProvided;
  setEvent: Dispatch<SetStateAction<Schema_GridEvent>>;
}

export const NewSomedayEvent = ({
  event,
  isDrafting,
  isDragging,
  isOverGrid,
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
  isDrafting && console.log("drafting: ", event._id);

  return (
    <>
      <NewStyledSomedayEvent
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        isDragging={isDragging}
        isDrafting={isDrafting}
        isOverGrid={isOverGrid}
        isFocused={isFocused}
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          onDraft(event);
        }}
        onBlur={() => setIsFocused(false)}
        onFocus={() => setIsFocused(true)}
        priority={event.priority}
        role="button"
        ref={provided.innerRef}
      >
        <div ref={reference}>
          <SomedayEventRectangle event={event} onMigrate={onMigrate} />
        </div>
      </NewStyledSomedayEvent>

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
