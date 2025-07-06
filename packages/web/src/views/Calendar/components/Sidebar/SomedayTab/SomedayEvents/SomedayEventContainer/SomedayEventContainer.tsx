import React, { useEffect, useState } from "react";
import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import {
  DraggableProvided,
  DraggableStateSnapshot,
  DropResult,
} from "@hello-pangea/dnd";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { useDraftForm } from "@web/views/Calendar/components/Draft/hooks/state/useDraftForm";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { Setters_Sidebar } from "@web/views/Calendar/components/Draft/sidebar/hooks/useSidebarState";
import {
  canSendToOtherSection,
  useKeyboardDrag,
} from "@web/views/Calendar/hooks/keyboard/useKeyboardDrag";
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
  index: number;
  totalEvents: number;
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
  index,
}: Props) => {
  // Using non-null assertion since `useSidebarContext` throws if context is missing.

  const { actions, setters, state } = useSidebarContext()!;
  const events = state.getEventsByCategory(category);

  const formProps = useDraftForm(
    category,
    state.isSomedayFormOpen && state.draft?._id === event._id,
    actions.discard,
    actions.reset,
    setters.setIsSomedayFormOpen,
  );

  const [isFocused, setIsFocused] = useState(false);
  const [hasCrossColumnReorder, setHasCrossColumnReorder] = useState(null);

  const isDraftingThisEvent =
    state.isDrafting && state.draft?._id === event._id;

  useEffect(() => {
    if (hasCrossColumnReorder) {
      setTimeout(() => {
        // Perform synthetic space bar press
        // select data-event-id
        const el = document.querySelector(
          `[data-event-id="${hasCrossColumnReorder}"]`,
        );
        if (el) {
          const spaceEvent = new KeyboardEvent("keydown", {
            key: " ",
            code: "Space",
            keyCode: 32,
            charCode: 32,
            bubbles: true,
          });
          el.dispatchEvent(spaceEvent);
        }
      }, 100);

      setHasCrossColumnReorder(null);
    }
  }, [hasCrossColumnReorder]);

  const handleKeyDown = useKeyboardDrag({
    event,
    category,
    index,
    isDragging: isDragging || isDrafting,
    onExitDrag: (index) => {
      const _canSendToOtherSection = canSendToOtherSection(
        events.length,
        category,
        index,
      );
      if (!_canSendToOtherSection) {
        return;
      }

      // Programmatically dispatch a "space" keydown event on the currently
      // focused element. In `@hello-pangea/dnd`, pressing the space key while
      // in keyboard-dragging mode finalises (drops) the draggable, therefore
      // this emulates the user pressing space to exit drag mode when they
      // reach either end of the list.

      const activeEl = document.activeElement as HTMLElement;
      const keyboardEvent = new KeyboardEvent("keydown", {
        key: " ",
        code: "Space",
        keyCode: 32,
        charCode: 32,
        bubbles: true,
      });
      activeEl.dispatchEvent(keyboardEvent);

      // After "dropping" the item via space-bar event, perform a synthetic
      // cross-column drag so the item is moved from week → month or vice-versa.
      const sourceDroppableId =
        category === Categories_Event.SOMEDAY_WEEK ? COLUMN_WEEK : COLUMN_MONTH;

      const destinationDroppableId =
        category === Categories_Event.SOMEDAY_WEEK ? COLUMN_MONTH : COLUMN_WEEK;

      const syntheticResult: DropResult = {
        draggableId: event._id!,
        source: {
          droppableId: sourceDroppableId,
          index,
        },
        destination: {
          droppableId: destinationDroppableId,
          index: 0, // place at top of destination list
        },
        // The fields below are not used by the `reorder` helper but are
        // required by the `DropResult` type. We can safely set sensible
        // defaults.
        combine: null,
        mode: "FLUID",
        reason: "DROP",
        type: "DEFAULT",
      } as DropResult;

      // Trigger sidebar state update + backend sync
      actions.onReorder(syntheticResult);

      // Set flag to trigger useEffect for synthetic space bar press
      setHasCrossColumnReorder(event._id);
    },
  });

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
        onKeyDown={(e) => {
          if (isDragging) handleKeyDown(e);
        }}
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
