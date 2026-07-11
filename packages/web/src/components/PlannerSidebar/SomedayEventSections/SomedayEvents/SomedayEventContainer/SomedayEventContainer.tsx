import { FloatingFocusManager, FloatingPortal } from "@floating-ui/react";
import { type Ref, useRef } from "react";
import { toast } from "react-toastify";
import { Priorities } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import {
  Categories_Event,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { computeCurrentEventDateRange } from "@web/common/utils/datetime/web.date.util";
import { getDraftTimes } from "@web/common/utils/draft/draft.util";
import { refocusEventElement } from "@web/common/utils/event/event.util";
import { schemaEventToLocalEvent } from "@web/common/utils/event/someday.event.util";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { type Setters_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarState";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { SomedayEvent } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEvent/SomedayEvent";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { eventToSchemaEvent } from "@web/events/queries/event.legacy-bridge";
import { scheduleSomedayEventTransition } from "@web/events/someday-event-draft.adapter";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { FloatingFormContainer } from "@web/views/Forms/SomedayEventForm/FloatingFormContainer";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm/SomedayEventForm";
import { useDraftForm } from "@web/views/Week/components/Draft/hooks/state/useDraftForm";
import { getSidebarOpenWidth } from "@web/views/Week/layout.constants";

export interface Props {
  category: SomedayInteractionCategory;
  event: Event;
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
  const mutations = useEventMutations();
  const { data: calendars } = useCalendarsQuery();

  const formProps = useDraftForm(
    category,
    state.isSomedayFormOpen && state.draft?.id === event.id,
    actions.discard,
    actions.reset,
    setters.setIsSomedayFormOpen,
  );

  const isFocusedRef = useRef(false);

  useAppShortcut("Enter", () => {
    if (!isFocusedRef.current) return;
    actions.onDraft(eventToSchemaEvent(event), category);
  });

  const migrateEvent = (direction: "up" | "down") => {
    const canMigrate = event.recurrence.kind === "single";
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
      computeCurrentEventDateRange(
        { duration },
        eventToSchemaEvent(event),
        weekViewRange,
      ),
    );
    refocusEventElement(event.id);
  };

  const scheduleEvent = () => {
    const isCurrentWeek = dayjs().isBetween(
      weekViewRange.startDate,
      weekViewRange.endDate,
      "day",
      "[]",
    );
    const { startDate, endDate } = getDraftTimes(
      isCurrentWeek,
      dayjs(weekViewRange.startDate),
    );

    const calendarId = getDefaultTargetCalendar(calendars ?? [])?.id;
    const input = calendarId
      ? scheduleSomedayEventTransition(
          { startDate, endDate },
          false,
          calendarId,
        )
      : null;

    if (input) {
      mutations.transition({ id: event.id, input });
    }
    refocusEventElement(event.id);
  };

  const whenFocused =
    (action: () => void) => (keyboardEvent: KeyboardEvent) => {
      if (!isFocusedRef.current) return;
      keyboardEvent.preventDefault();
      action();
    };

  useAppShortcut(
    "Shift+ArrowUp",
    whenFocused(() => migrateEvent("up")),
  );
  useAppShortcut(
    "Shift+ArrowDown",
    whenFocused(() => migrateEvent("down")),
  );
  useAppShortcut("Shift+ArrowRight", whenFocused(scheduleEvent));

  const isDraftingThisEvent = state.isDrafting && state.draft?.id === event.id;
  // A brand-new draft's `state.draft.id`/dates are client-synthesized
  // placeholders (schemaEventToLocalEvent invents an id and anchors the
  // schedule on today to satisfy Event's required fields, since this local
  // cache always holds full Event bodies). Neither must read back as real:
  // a synthesized `_id` makes onSubmit's edit/create branch pick "edit" for
  // an id nothing in the repository has, silently dropping the create; a
  // synthesized `startDate`/`endDate` short-circuits onSubmit's own
  // getDatesByCategory computation, persisting today's date instead of the
  // target column's actual (week-start-normalized) range.
  const formEvent = {
    ...eventToSchemaEvent(
      isDraftingThisEvent && state.draft ? state.draft : event,
    ),
    ...(state.isDraftingNew
      ? { _id: undefined, startDate: undefined, endDate: undefined }
      : {}),
  };

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
          actions.onDraft(eventToSchemaEvent(event), category);
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
            <FloatingFormContainer
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
                  const isRecurring = event.recurrence.kind !== "single";
                  const deleteScope = isRecurring
                    ? RecurringEventUpdateScope.ALL_EVENTS
                    : RecurringEventUpdateScope.THIS_EVENT;
                  deleteEvent(deleteScope);
                }}
                onDuplicate={duplicateEvent}
                onMigrate={actions.onMigrate}
                onSubmit={onSubmit}
                setEvent={(next) =>
                  setEvent((previous) => {
                    const resolved =
                      typeof next === "function"
                        ? next(previous ? eventToSchemaEvent(previous) : null)
                        : next;

                    return resolved
                      ? schemaEventToLocalEvent(resolved, event.calendarId)
                      : null;
                  })
                }
              />
            </FloatingFormContainer>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};
