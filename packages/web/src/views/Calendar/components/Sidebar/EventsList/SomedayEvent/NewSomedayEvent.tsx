import React, { Dispatch, SetStateAction, useState } from "react";
import { DraggableProvided } from "@hello-pangea/dnd";
import { Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

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
  const [isFocused, setIsFocused] = useState(false);

  return (
    <NewStyledSomedayEvent
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      isDragging={isDragging}
      isDrafting={isDrafting}
      isOverGrid={isOverGrid}
      isFocused={isFocused}
      onClick={() => console.log("clicked")}
      onBlur={() => setIsFocused(false)}
      onFocus={() => setIsFocused(true)}
      priority={event.priority}
      role="button"
      ref={provided.innerRef}
    >
      <SomedayEventRectangle event={event} onMigrate={onMigrate} />
    </NewStyledSomedayEvent>
  );
};
