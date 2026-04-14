import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import {
  type DraggableProvided,
  type DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { useState } from "react";
import { toast } from "react-toastify";
import { Priorities } from "@core/constants/core.constants";
import {
  Categories_Event,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { useAppHotkey } from "@web/common/hooks/useAppHotkey";
import { computeCurrentEventDateRange } from "@web/common/utils/datetime/web.date.util";
import { useDraftForm } from "@web/views/Calendar/components/Draft/hooks/state/useDraftForm";
import { type SidebarDraftContextValue } from "@web/views/Calendar/components/Draft/sidebar/context/SidebarDraftContext";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { type Setters_Sidebar } from "@web/views/Calendar/components/Draft/sidebar/hooks/useSidebarState";
import { SomedayEvent } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEvent/SomedayEvent";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";

export interface Props {
  category: Categories_Event;
  event: Schema_Event;
  isDrafting: boolean;
  isDragging: boolean;
  isOverGrid: boolean;
  onSubmit: (event?: Schema_Event) => void;
  deleteEvent: (applyTo?: RecurringEventUpdateScope) => void;
  duplicateEvent: () => void;
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
  deleteEvent,
  duplicateEvent,
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

  useAppHotkey("Enter", () => actions.onDraft(event, category), {
    enabled: isFocused,
  });

  const migrateEvent = (direction: "up" | "down") => {
    const canMigrate =
      !event.recurrence?.rule || event.recurrence?.rule.length === 0;
    if (!canMigrate) {
      toast.error("Can't migrate recurring events");
      return;
    }
    const [duration, targetCategory] =
      direction === "up"
        ? (["week", Categories_Event.SOMEDAY_WEEK] as const)
        : (["month", Categories_Event.SOMEDAY_MONTH] as const);
    void actions.onSubmit(
      targetCategory,
      computeCurrentEventDateRange({ duration }, event, weekViewRange),
    );
  };

  useAppHotkey("Control+Meta+ArrowUp", () => migrateEvent("up"), {
    enabled: isFocused,
  });
  useAppHotkey("Control+Meta+ArrowDown", () => migrateEvent("down"), {
    enabled: isFocused,
  });

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
                onDelete={() => {
                  // For recurring someday events, delete the entire series
                  const isRecurring =
                    Array.isArray(event.recurrence?.rule) ||
                    typeof event.recurrence?.eventId === "string";
                  const deleteScope = isRecurring
                    ? RecurringEventUpdateScope.ALL_EVENTS
                    : RecurringEventUpdateScope.THIS_EVENT;
                  deleteEvent(deleteScope);
                }}
                onDuplicate={duplicateEvent}
                onMigrate={actions.onMigrate}
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
