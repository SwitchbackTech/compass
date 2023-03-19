import React, { Dispatch, SetStateAction } from "react";
import { DroppableProvided, DraggableProvided } from "@hello-pangea/dnd";
import { FloatingPortal } from "@floating-ui/react";
import { useFloating } from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { Category_DragItem } from "@web/common/types/dnd.types";

import { SomedayEventRectangle } from "./SomedayEventRectangle";
import { NewStyledSomedayEvent } from "./newStyled";

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
  // const { y, reference, floating, strategy } = useFloating({
  //   strategy: "absolute",
  //   placement: "right-start",
  // });

  return (
    <NewStyledSomedayEvent
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      isDragging={isDragging}
      isDrafting={isDrafting}
      isOverGrid={isOverGrid}
      isFocused={false}
      onClick={() => console.log("clicked")}
      priority={event.priority}
      role="button"
      ref={provided.innerRef}
    >
      <SomedayEventRectangle event={event} onMigrate={onMigrate} />
    </NewStyledSomedayEvent>
  );
};
