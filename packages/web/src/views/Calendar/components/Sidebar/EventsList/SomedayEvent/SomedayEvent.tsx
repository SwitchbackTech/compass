import React, { Dispatch, MouseEvent, SetStateAction, useState } from "react";
import { DraggableProvided } from "@hello-pangea/dnd";
import { FloatingPortal } from "@floating-ui/react";
import { useFloating } from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";

import { StyledSomedayEvent } from "./styled";
import { SomedayEventRow } from "./SomedayEventRow";

export interface Props {
  event: Schema_Event;
  isDrafting: boolean;
  isDragging: boolean;
  onClose: () => void;
  onDraft: (event: Schema_Event) => void;
  onMigrate: (event: Schema_Event, location: "forward" | "back") => void;
  onSubmit: () => void;
  provided: DraggableProvided;
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
  // const { y, reference, floating, strategy } = useFloating({
  //   strategy: "absolute",
  //   placement: "right-start",
  // });
  const [isFocused, setIsFocused] = useState(false);

  return (
    <StyledSomedayEvent
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      isDragging={isDragging}
      isDrafting={isDrafting}
      isFocused={isFocused}
      onBlur={() => setIsFocused(false)}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onDraft(event);
      }}
      onFocus={() => setIsFocused(true)}
      priority={event.priority}
      role="button"
      ref={provided.innerRef}
    >
      <SomedayEventRow event={event} onMigrate={onMigrate} />
    </StyledSomedayEvent>

    //   {/* <FloatingPortal>
    //     {isDrafting && !isDragging && (
    //       <StyledFloatContainer
    //         ref={floating}
    //         strategy={strategy}
    //         top={y ?? 40}
    //         left={SIDEBAR_OPEN_WIDTH}
    //       >
    //         <SomedayEventForm
    //           event={event}
    //           onClose={onClose}
    //           onSubmit={onSubmit}
    //           setEvent={setEvent}
    //         />
    //       </StyledFloatContainer>
    //     )}
    //   </FloatingPortal> */}
  );
};
