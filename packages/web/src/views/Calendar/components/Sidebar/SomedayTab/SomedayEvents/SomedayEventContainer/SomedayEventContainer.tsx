import React, { useState } from "react";
import { toast } from "react-toastify";
import { Key } from "ts-key-enum";
import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { computeCurrentEventDateRange } from "@web/common/utils/web.date.util";
import { useDraftForm } from "@web/views/Calendar/components/Draft/hooks/state/useDraftForm";
import { SidebarDraftContextValue } from "@web/views/Calendar/components/Draft/sidebar/context/SidebarDraftContext";
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
  const context = useSidebarContext() as SidebarDraftContextValue;
  const { state, actions, setters } = context;

  const formProps = useDraftForm(
    category,
    state.isSomedayFormOpen && state.draft?._id === event._id,
    actions.discard,
    actions.reset,
    setters.setIsSomedayFormOpen,
  );

  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // ENTER opens the edit form
    if (e.key === Key.Enter) {
      e.preventDefault();
      e.stopPropagation();
      actions.onDraft(event, category);
      return;
    }

    // META + CTRL + UP/DOWN should migrate the event between Someday lists
    const isMetaCtrl = e.metaKey && e.ctrlKey;
    const isArrowUp = e.key === "ArrowUp";
    const isArrowDown = e.key === "ArrowDown";

    if (isMetaCtrl && (isArrowUp || isArrowDown)) {
      e.preventDefault();
      e.stopPropagation();

      // Prevent migrating recurring events
      const canMigrate =
        !event.recurrence?.rule || event.recurrence?.rule.length === 0;

      if (!canMigrate) {
        toast.error("Can't migrate recurring events");
        return;
      }

      const duration = isArrowUp ? "week" : "month";
      const targetCategory = isArrowUp
        ? Categories_Event.SOMEDAY_WEEK
        : Categories_Event.SOMEDAY_MONTH;

      const updatedEvent = computeCurrentEventDateRange(
        { duration },
        event,
        weekViewRange,
      );

      actions.onSubmit(targetCategory, updatedEvent);
    }
  };

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
        onKeyDown={handleKeyDown}
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
