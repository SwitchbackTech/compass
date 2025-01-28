import { Key } from "ts-key-enum";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  DraggableProvided,
  DraggableStateSnapshot,
  DraggableStyle,
} from "@hello-pangea/dnd";
import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";
import { Util_Sidebar } from "@web/views/Calendar/hooks/draft/sidebar/useSidebarUtil";

import { StyledNewSomedayEvent } from "./styled";
import { SomedayEventRectangle } from "./SomedayEventRectangle";

function getStyle(
  style: DraggableStyle,
  snapshot: DraggableStateSnapshot,
  isOverGrid: boolean
) {
  if (!snapshot.isDropAnimating) {
    return style;
  }

  const disableDropAnimationStyles = {
    ...style,
    // cannot be 0, but make it super tiny. See https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/guides/drop-animation.md#skipping-the-drop-animation
    transitionDuration: `0.001s`,
  };

  // Drop animation adds delay to the `onDragEnd` event, causes bad UX when
  // dragging events to the grid. Disable drop animation when dragging events
  // to the grid.
  if (isOverGrid) {
    return disableDropAnimationStyles;
  }

  return style;
}

export interface Props {
  category: Categories_Event;
  event: Schema_GridEvent;
  isDrafting: boolean;
  isDragging: boolean;
  isOverGrid: boolean;
  onClose: () => void;
  onDraft: (event: Schema_GridEvent, category: Categories_Event) => void;
  onMigrate: Util_Sidebar["onMigrate"];
  onSubmit: (event?: Schema_Event) => void;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
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
  snapshot,
  setEvent,
}: Props) => {
  const formType =
    category === Categories_Event.SOMEDAY_WEEK ? "sidebarWeek" : "sidebarMonth";

  const { context, refs, strategy, y } = useEventForm(formType);

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
          onDraft(event, category);
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <>
      <StyledNewSomedayEvent
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        style={getStyle(provided.draggableProps.style, snapshot, isOverGrid)}
        isDragging={isDragging}
        isDrafting={isDrafting}
        isOverGrid={isOverGrid}
        isFocused={isFocused}
        onBlur={() => setIsFocused(false)}
        onClick={(e) => {
          e.stopPropagation();
          onDraft(event, category);
        }}
        onFocus={() => setIsFocused(true)}
        onKeyDown={onKeyDown}
        priority={event.priority}
        role="button"
        ref={provided.innerRef}
      >
        <div ref={refs.setReference}>
          <SomedayEventRectangle
            category={category}
            event={event}
            onMigrate={onMigrate}
          />
        </div>
      </StyledNewSomedayEvent>

      {shouldOpenForm && (
        <FloatingPortal>
          <FloatingFocusManager context={context}>
            <StyledFloatContainer
              ref={refs.setFloating}
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
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};
