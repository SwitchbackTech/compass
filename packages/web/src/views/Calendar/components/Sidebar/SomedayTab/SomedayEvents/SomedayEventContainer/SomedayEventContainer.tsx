import React, { useState } from "react";
import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { useDraftForm } from "@web/views/Calendar/components/Draft/hooks/state/useDraftForm";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { Setters_Sidebar } from "@web/views/Calendar/components/Draft/sidebar/hooks/useSidebarState";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { SomedayEvent } from "../SomedayEvent/SomedayEvent";

export interface Props {
  category: Categories_Event;
  event: Schema_Event;
  isDrafting: boolean;
  isDragging: boolean;
  isOverGrid: boolean;
  onSubmit: (event?: Schema_Event) => void;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  setEvent: Setters_Sidebar["setDraft"];
  weekViewRange: {
    startDate: string;
    endDate: string;
  };
}

export const SomedayEventContainer = ({
  category,
  event,
  isDrafting,
  isDragging,
  isOverGrid,
  onSubmit,
  provided,
  snapshot,
  setEvent,
  weekViewRange,
}: Props) => {
  const { actions, setters, state } = useSidebarContext();

  const formProps = useDraftForm(
    category,
    state.isSomedayFormOpen && state.draft?._id === event._id,
    actions.discard,
    actions.reset,
    setters.setIsSomedayFormOpen,
  );

  const [isFocused, setIsFocused] = useState(false);

  const isDraftingThisEvent =
    state.isDrafting && state.draft?._id === event._id;

  return (
    <>
      <SomedayEvent
        category={category}
        event={event}
        isDrafting={isDrafting}
        isDragging={isDragging}
        isOverGrid={isOverGrid}
        isFocused={isFocused}
        onBlur={() => setIsFocused(false)}
        onClick={() => {
          actions.onDraft(event, category);
        }}
        onFocus={() => setIsFocused(true)}
        onKeyDown={() => console.log("onKeyDown")}
        priority={event.priority || Priorities.UNASSIGNED}
        provided={provided}
        snapshot={snapshot}
        onMigrate={actions.onMigrate}
        formProps={formProps}
      />

      {state.isSomedayFormOpen && isDraftingThisEvent && (
        <FloatingPortal>
          <FloatingFocusManager context={formProps.context}>
            <StyledFloatContainer
              ref={formProps.refs.setFloating}
              strategy={formProps.strategy}
              top={formProps.y}
              left={SIDEBAR_OPEN_WIDTH}
            >
              <SomedayEventForm
                event={event}
                category={category}
                onClose={() => {
                  actions.closeForm();
                  actions.close();
                }}
                onMigrate={actions.onMigrate}
                onSubmit={onSubmit}
                setEvent={setEvent}
                weekViewRange={weekViewRange}
              />
            </StyledFloatContainer>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};
