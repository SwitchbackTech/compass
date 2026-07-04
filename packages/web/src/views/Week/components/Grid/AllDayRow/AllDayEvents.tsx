import { useMemo } from "react";
import { Categories_Event } from "@core/types/event.types";
import { ID_GRID_EVENTS_ALLDAY } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import {
  draftActions,
  selectDraft,
  selectDraftId,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { AllDayEventMemo } from "@web/views/Week/components/Grid/AllDayRow/AllDayEvent";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  getWeekInteractionTargetAttributes,
  useWeekEventRegistrationRef,
} from "@web/views/Week/interaction/registry/weekEventRegistry";

interface Props {
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfView"];
  endOfView: WeekProps["component"]["endOfView"];
}
export const AllDayEvents = ({
  measurements,
  startOfView,
  endOfView,
}: Props) => {
  const draft = useDraftStore(selectDraft);
  const { allDayEvents, isPending: isLoadingWeekView } = useWeekEventViewModel({
    startOfView,
    endOfView,
  });

  const draftId = useDraftStore(selectDraftId);

  const handleKeyDown = (event: Schema_GridEvent) => {
    draftActions.start({
      activity: "keyboardEdit",
      event,
      eventType: Categories_Event.ALLDAY,
    });
  };

  return (
    <div
      className="relative ml-[50px] h-full w-full"
      id={ID_GRID_EVENTS_ALLDAY}
    >
      {!isLoadingWeekView &&
        allDayEvents.map((event: Schema_GridEvent) => {
          const isPlaceholder = event._id === draftId;
          const eventForDisplay =
            isPlaceholder && draft && draft._id === event._id
              ? { ...event, ...draft }
              : event;

          return (
            <AllDayEventItem
              endOfView={endOfView}
              event={eventForDisplay}
              isPlaceholder={isPlaceholder}
              key={event._id}
              measurements={measurements}
              onKeyDown={handleKeyDown}
              startOfView={startOfView}
            />
          );
        })}
    </div>
  );
};

interface AllDayEventItemProps {
  endOfView: WeekProps["component"]["endOfView"];
  event: Schema_GridEvent;
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  onKeyDown: (event: Schema_GridEvent) => void;
  startOfView: WeekProps["component"]["startOfView"];
}

const AllDayEventItem = ({
  endOfView,
  event,
  isPlaceholder,
  measurements,
  onKeyDown,
  startOfView,
}: AllDayEventItemProps) => {
  const isRegisteredForWeekInteraction = Boolean(event._id) && !isPlaceholder;
  const registrationRef = useWeekEventRegistrationRef({
    eventId: event._id,
    eventType: "all-day",
    isEnabled: isRegisteredForWeekInteraction,
  });

  const interactionAttributes = useMemo(
    () =>
      isRegisteredForWeekInteraction
        ? getWeekInteractionTargetAttributes({
            eventId: event._id,
            eventType: "all-day",
          })
        : undefined,
    [event._id, isRegisteredForWeekInteraction],
  );

  return (
    <AllDayEventMemo
      endOfView={endOfView}
      event={event}
      interactionAttributes={interactionAttributes}
      isPlaceholder={isPlaceholder}
      measurements={measurements}
      onKeyDown={onKeyDown}
      ref={registrationRef}
      startOfView={startOfView}
    />
  );
};
