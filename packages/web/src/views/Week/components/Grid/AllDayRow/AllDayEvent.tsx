import { type ForwardedRef, forwardRef, type MouseEvent, memo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type CalendarCardIdentity } from "@web/calendars/useCalendarLookup";
import { type GridEvent } from "@web/common/types/web.event.types";
import { AllDayEventCard } from "@web/grid/components/AllDayEventCard";
import { getAllDayEventPosition } from "@web/grid/layout/event.position";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

interface Props {
  calendarIdentity?: CalendarCardIdentity | null;
  event: GridEvent;
  interactionAttributes?: Record<string, string | undefined>;
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  weekDays: WeekProps["component"]["weekDays"];
  onMouseDown?: (e: MouseEvent, event: GridEvent) => void;
  onKeyDown?: (event: GridEvent) => void;
  onScalerMouseDown?: (
    event: GridEvent,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
}

const AllDayEventBase = (
  {
    calendarIdentity = null,
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
  const position = getAllDayEventPosition(event, {
    isDraft: false,
    measurements,
    visibleDates,
  });

  const handleEventMouseDown = (e: MouseEvent, selectedEvent: GridEvent) => {
    // Always stop bubble so the all-day row's create-draft handler cannot
    // overwrite a card click (including read-only open).
    e.stopPropagation();
    if (!onMouseDown) return;

    onMouseDown(e, selectedEvent);
  };

  return (
    <AllDayEventCard
      calendarIdentity={calendarIdentity}
      event={event}
      interactionAttributes={interactionAttributes}
      isPlaceholder={isPlaceholder}
      onEventKeyDown={onKeyDown}
      onEventMouseDown={handleEventMouseDown}
      onScalerMouseDown={onScalerMouseDown}
      position={position}
      ref={ref}
    />
  );
};

const AllDayEvent = forwardRef(AllDayEventBase);

export const AllDayEventMemo = memo(AllDayEvent, (prev, next) => {
  return (
    prev.calendarIdentity === next.calendarIdentity &&
    prev.event === next.event &&
    prev.interactionAttributes === next.interactionAttributes &&
    prev.isPlaceholder === next.isPlaceholder &&
    prev.measurements === next.measurements &&
    // The visible window can move without the event or measurements changing
    prev.weekDays === next.weekDays
  );
});
