import { Key } from "ts-key-enum";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DraggableProvided } from "@hello-pangea/dnd";
import { FloatingPortal } from "@floating-ui/react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";

import { NewStyledSomedayEvent } from "./styled";
import { SomedayEventRectangle } from "./SomedayEventRectangle";

export interface Props {
  category: Categories_Event;
  event: Schema_GridEvent;
  isDrafting: boolean;
  isDragging: boolean;
  isOverGrid: boolean;
  onClose: () => void;
  onDraft: (event: Schema_GridEvent) => void;
  onMigrate: (event: Schema_GridEvent, location: "forward" | "back") => void;
  onSubmit: (event?: Schema_Event) => void;
  provided: DraggableProvided;
  setEvent: Dispatch<SetStateAction<Schema_GridEvent>>;
}

export const SomedayEvent = ({
  category,
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
  const formType =
    category === Categories_Event.SOMEDAY_WEEK ? "sidebarWeek" : "sidebarMonth";
  const { y, reference, floating, strategy } = useEventForm(formType);

  const [isFocused, setIsFocused] = useState(false);

  const initialFormOpen = event?.isOpen || (isDrafting && !isDragging);
  const [shouldOpenForm, setShouldOpenForm] = useState(initialFormOpen);

  useEffect(() => {
    setShouldOpenForm(event?.isOpen || (isDrafting && !isDragging));
  }, [event?.isOpen, isDrafting, isDragging]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case Key.Escape: {
        if (isFocused) {
          setIsFocused(false);
        }
        break;
      }

      case Key.Enter: {
        if (!shouldOpenForm) {
          onDraft(event);
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <>
      <NewStyledSomedayEvent
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        isDragging={isDragging}
        isDrafting={isDrafting}
        isOverGrid={isOverGrid}
        isFocused={isFocused}
        onBlur={() => setIsFocused(false)}
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          onDraft(event);
        }}
        onFocus={() => setIsFocused(true)}
        onKeyDown={onKeyDown}
        priority={event.priority}
        role="button"
        ref={provided.innerRef}
      >
        <div ref={reference}>
          <SomedayEventRectangle
            category={category}
            event={event}
            onMigrate={onMigrate}
          />
        </div>
      </NewStyledSomedayEvent>

      <FloatingPortal>
        {shouldOpenForm && (
          <StyledFloatContainer
            ref={floating}
            strategy={strategy}
            top={y ?? 40}
            left={SIDEBAR_OPEN_WIDTH}
          >
            <SomedayEventForm
              event={event}
              onClose={() => {
                setShouldOpenForm(false);
                onClose();
              }}
              onConvert={() =>
                console.log("TODO: convert someday event to grid event")
              }
              onSubmit={onSubmit}
              setEvent={setEvent}
            />
          </StyledFloatContainer>
        )}
      </FloatingPortal>
    </>
  );
};
