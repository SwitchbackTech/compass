import { type ForwardedRef, forwardRef, type MouseEvent, memo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { CalendarAllDayEventCard } from "@web/common/calendar-grid/components/CalendarAllDayEventCard";
import { getCalendarAllDayEventPosition } from "@web/common/calendar-grid/layout/calendarEventPosition";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { useSomedayCommitAcknowledgement } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/state/somedayCommitAcknowledgementState";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  clearHoveredCalendarEventTarget,
  setHoveredCalendarEventTarget,
} from "@web/views/Week/interaction/targeting/weekCalendarEventTargeting";

interface Props {
  event: Schema_GridEvent;
  interactionAttributes?: Record<string, string | undefined>;
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  weekDays: WeekProps["component"]["weekDays"];
  onMouseDown?: (e: MouseEvent, event: Schema_GridEvent) => void;
  onKeyDown?: (event: Schema_GridEvent) => void;
  onScalerMouseDown?: (
    event: Schema_GridEvent,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
}

const AllDayEventBase = (
  {
    event,
    interactionAttributes,
    isPlaceholder,
    measurements,
    weekDays,
    onMouseDown,
    onKeyDown,
    onScalerMouseDown,
  }: Props,
  ref: ForwardedRef<HTMLDivElement>,
) => {
  // Positions map to the rendered day columns, which may be a window of the
  // week rather than all 7 days.
  const visibleDates = weekDays.map((date) => ({
    date,
    key: date.format(YEAR_MONTH_DAY_FORMAT),
  }));
  const position = getCalendarAllDayEventPosition(event, {
    isDraft: false,
    measurements,
    visibleDates,
  });

  const shouldAcknowledgeCommit =
    useSomedayCommitAcknowledgement(event._id) && !isPlaceholder;
  const shouldTrackCalendarHover = !isPlaceholder && Boolean(event._id);
  const handleEventMouseDown = (
    e: MouseEvent,
    selectedEvent: Schema_GridEvent,
  ) => {
    if (!onMouseDown) {
      e.stopPropagation();
      return;
    }

    onMouseDown(e, selectedEvent);
  };

  return (
    <CalendarAllDayEventCard
      event={event}
      interactionAttributes={interactionAttributes}
      isCommitAcknowledged={shouldAcknowledgeCommit}
      isPlaceholder={isPlaceholder}
      onEventKeyDown={onKeyDown}
      onEventMouseDown={handleEventMouseDown}
      onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
        if (!shouldTrackCalendarHover) return;

        setHoveredCalendarEventTarget(e.currentTarget);
      }}
      onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
        clearHoveredCalendarEventTarget(e.currentTarget);
      }}
      onScalerMouseDown={onScalerMouseDown}
      position={position}
      ref={ref}
    />
  );
};

const AllDayEvent = forwardRef(AllDayEventBase);

export const AllDayEventMemo = memo(AllDayEvent, (prev, next) => {
  return (
    prev.event === next.event &&
    prev.interactionAttributes === next.interactionAttributes &&
    prev.isPlaceholder === next.isPlaceholder &&
    prev.measurements === next.measurements &&
    // The visible window can move without the event or measurements changing
    prev.weekDays === next.weekDays
  );
});
