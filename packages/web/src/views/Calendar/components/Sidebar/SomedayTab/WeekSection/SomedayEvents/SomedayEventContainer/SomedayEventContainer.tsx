import React, { useState } from "react";
import { Key } from "ts-key-enum";
import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { Actions_Sidebar } from "../../../../../Draft/sidebar/hooks/useSidebarActions";
import { Setters_Sidebar } from "../../../../../Draft/sidebar/hooks/useSidebarState";
import { SomedayEvent } from "../SomedayEvent/SomedayEvent";

export interface Props {
  category: Categories_Event;
  event: Schema_Event;
  isDrafting: boolean;
  isDragging: boolean;
  isOverGrid: boolean;
  onMigrate: Actions_Sidebar["onMigrate"];
  onSubmit: (event?: Schema_Event) => void;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  setEvent: Setters_Sidebar["setDraft"];
}

export const SomedayEventContainer = ({
  category,
  event,
  isDrafting,
  isDragging,
  isOverGrid,
  onMigrate,
  onSubmit,
  provided,
  snapshot,
  setEvent,
}: Props) => {
  // const formType =
  //   category === Categories_Event.SOMEDAY_WEEK ? "sidebarWeek" : "sidebarMonth";
  const { actions, setters, state } = useSidebarContext();

  const { formProps } = state;

  const [isFocused, setIsFocused] = useState(false);

  const isDraftingThisEvent =
    state.isDrafting && state.draft?._id === event._id;

  // const initialFormOpen = event?.isOpen || (isDrafting && !isDragging);
  // const [shouldOpenForm, setShouldOpenForm] = useState(initialFormOpen);

  // useEffect(() => {
  //   setShouldOpenForm(event?.isOpen || (isDrafting && !isDragging));
  // }, [event?.isOpen, isDrafting, isDragging]);

  // const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
  //   switch (e.key) {
  //     case Key.Escape: {
  //       if (isFocused) {
  //         setIsFocused(false);
  //       }
  //       break;
  //     }

  //     case Key.Enter: {
  //       if (!shouldOpenForm) {
  //         actions.onDraft(event, category);
  //       }
  //       break;
  //     }
  //     default:
  //       break;
  //   }
  // };

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
        onClick={() => actions.onDraft(event, category)} //m: stop prop
        onFocus={() => setIsFocused(true)}
        onKeyDown={() => console.log("onKeyDown")}
        priority={event.priority || Priorities.UNASSIGNED}
        provided={provided}
        snapshot={snapshot}
        onMigrate={onMigrate}
        formRef={formProps.refs.setReference}
      />

      {state.isSomedayFormOpen && isDraftingThisEvent && (
        <FloatingPortal>
          <FloatingFocusManager context={formProps.context}>
            <StyledFloatContainer
              ref={formProps.refs.setFloating}
              strategy={formProps.strategy}
              top={formProps.y ?? 40}
              left={SIDEBAR_OPEN_WIDTH}
            >
              <SomedayEventForm
                event={event}
                onClose={() => {
                  setters.setIsSomedayFormOpen(false);
                  actions.close();
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
