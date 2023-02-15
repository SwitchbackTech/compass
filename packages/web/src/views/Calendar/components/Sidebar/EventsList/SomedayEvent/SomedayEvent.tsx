import React, { Dispatch, MouseEvent, SetStateAction } from "react";
import { FloatingPortal } from "@floating-ui/react";
import { useFloating } from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";

import { StyledEventOrPlaceholder } from "./styled";
import { SomedayEventRow } from "./SomedayEventRow";

export interface Props {
  event: Schema_Event;
  isDrafting: boolean;
  isDragging: boolean;
  onClose: () => void;
  onDraft: (event: Schema_Event) => void;
  onMigrate: (event: Schema_Event, location: "forward" | "back") => void;
  onSubmit: () => void;
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
  setEvent,
}: Props) => {
  const { y, reference, floating, strategy } = useFloating({
    strategy: "absolute",
    placement: "right-start",
  });

  return (
    <>
      <StyledEventOrPlaceholder
        isDragging={isDragging}
        isDrafting={isDrafting}
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          onDraft(event);
        }}
        priority={event.priority}
        role="button"
        ref={reference}
      >
        <SomedayEventRow event={event} onMigrate={onMigrate} />
      </StyledEventOrPlaceholder>

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
              onSubmit={onSubmit}
              setEvent={setEvent}
            />
          </StyledFloatContainer>
        )}
      </FloatingPortal>
    </>
  );
};
