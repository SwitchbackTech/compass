import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { type Ref, useRef } from "react";
import { toast } from "react-toastify";
import { Priorities } from "@core/constants/core.constants";
import {
  Categories_Event,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { useAppHotkey } from "@web/common/hooks/useAppHotkey";
import { computeCurrentEventDateRange } from "@web/common/utils/datetime/web.date.util";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { type Setters_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarState";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { SomedayEvent } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEvent/SomedayEvent";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { useDraftForm } from "@web/views/Week/components/Draft/hooks/state/useDraftForm";
import { getSidebarOpenWidth } from "@web/views/Week/layout.constants";

export interface Props {
  category: SomedayInteractionCategory;
  event: Schema_Event;
  isDrafting: boolean;
  isDragging: boolean;
  onSubmit: (event: Schema_Event | null) => void;
  deleteEvent: (applyTo?: RecurringEventUpdateScope) => void;
  duplicateEvent: () => void;
  interactionRef: Ref<HTMLDivElement>;
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
  onSubmit,
  deleteEvent,
  duplicateEvent,
  interactionRef,
  setEvent,
  weekViewRange,
}: Props) => {
  const { state, actions, setters } = useSidebarContext();

  const formProps = useDraftForm(
    category,
    state.isSomedayFormOpen && state.draft?._id === event._id,
    actions.discard,
    actions.reset,
    setters.setIsSomedayFormOpen,
  );

  const isFocusedRef = useRef(false);

  useAppHotkey("Enter", () => {
    if (!isFocusedRef.current) return;
    actions.onDraft(event, category);
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

  useAppHotkey("Control+Meta+ArrowUp", () => {
    if (!isFocusedRef.current) return;
    migrateEvent("up");
  });
  useAppHotkey("Control+Meta+ArrowDown", () => {
    if (!isFocusedRef.current) return;
    migrateEvent("down");
  });

  const isDraftingThisEvent =
    state.isDrafting && state.draft?._id === event._id;
  const formEvent = isDraftingThisEvent && state.draft ? state.draft : event;

  return (
    <>
      <SomedayEvent
        category={category}
        event={event}
        status={{
          isDrafting,
          isDragging,
        }}
        onBlur={() => {
          isFocusedRef.current = false;
        }}
        onClick={() => {
          actions.onDraft(event, category);
        }}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        interactionRef={interactionRef}
        priority={event.priority || Priorities.UNASSIGNED}
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
              left={getSidebarOpenWidth()}
            >
              <SomedayEventForm
                event={formEvent}
                category={category}
                isDraft={!formEvent._id}
                isExistingEvent={!!formEvent._id}
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
