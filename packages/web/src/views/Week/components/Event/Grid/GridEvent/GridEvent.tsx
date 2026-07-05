import {
  type ForwardedRef,
  forwardRef,
  type MouseEvent,
  memo,
  useState,
} from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { CalendarTimedEventCard } from "@web/common/calendar-grid/components/CalendarTimedEventCard";
import { getCalendarTimedEventPosition } from "@web/common/calendar-grid/layout/calendarEventPosition";
import {
  applyCalendarTimedEventDisplayPosition,
  type CalendarTimedDeckLayout,
} from "@web/common/calendar-grid/layout/calendarTimedDeckLayout";
import { ZIndex } from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { useSomedayCommitAcknowledgement } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/state/somedayCommitAcknowledgementState";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { isWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import {
  clearHoveredCalendarEventTarget,
  setHoveredCalendarEventTarget,
} from "@web/views/Week/interaction/targeting/weekCalendarEventTargeting";

interface Props {
  deckLayout?: CalendarTimedDeckLayout | null;
  displayMode: GridEventDisplayMode;
  event: Schema_GridEvent;
  interactionAttributes?: Record<string, string | undefined>;
  measurements: Measurements_Grid;
  motionMode?: GridEventMotionMode;
  onEventMouseDown?: (event: Schema_GridEvent, e: MouseEvent) => void;
  onEventKeyDown?: (event: Schema_GridEvent) => void;
  onScalerMouseDown?: (
    event: Schema_GridEvent,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
  weekProps: WeekProps;
}

type GridEventDisplayMode = "draft" | "placeholder" | "saved";
type GridEventMotionMode = "dragging" | "idle" | "resizing";

const GridEventBase = (
  {
    deckLayout = null,
    displayMode,
    event: _event,
    interactionAttributes,
    measurements,
    motionMode = "idle",
    onEventMouseDown,
    onEventKeyDown,
    onScalerMouseDown,
    weekProps,
  }: Props,
  ref: ForwardedRef<HTMLDivElement>,
) => {
  const { component } = weekProps;

  const isDraft = displayMode === "draft";
  const isDragging = motionMode === "dragging";
  const isPlaceholder = displayMode === "placeholder";
  const isResizing = motionMode === "resizing";
  const event = _event;
  const isDeck = Boolean(deckLayout);
  const [isFocused, setIsFocused] = useState(false);
  const shouldAcknowledgeCommit =
    useSomedayCommitAcknowledgement(event._id) &&
    !isDragging &&
    !isResizing &&
    !isPlaceholder &&
    !isDraft;

  const visibleDates = (
    component.weekDays?.length
      ? component.weekDays
      : Array.from(
          {
            length:
              component.endOfView
                .startOf("day")
                .diff(component.startOfView.startOf("day"), "day") + 1,
          },
          (_, index) => component.startOfView.startOf("day").add(index, "day"),
        )
  ).map((date) => ({
    date,
    key: date.format(YEAR_MONTH_DAY_FORMAT),
  }));
  const shouldUseDraftSizing = isDraft && !deckLayout;
  const basePosition = getCalendarTimedEventPosition(event, {
    isDraft: shouldUseDraftSizing,
    measurements,
    visibleDates,
  });
  const position = shouldUseDraftSizing
    ? basePosition
    : applyCalendarTimedEventDisplayPosition(basePosition, deckLayout);

  const shouldFloatAboveDeck = isDragging || isResizing || (isDraft && !isDeck);
  const zIndex = shouldFloatAboveDeck
    ? ZIndex.MAX
    : (position.zIndex ?? ZIndex.LAYER_1);

  const deckBoxShadow = (() => {
    if (!isDeck) return undefined;
    const ring = `0 0 0 0.75px ${theme.color.bg.primary}`;
    const drop = isFocused
      ? "0 6px 14px -3px rgba(0,0,0,0.55)"
      : "0 3px 6px -2px rgba(0,0,0,0.4)";
    const highlight = `inset 0 1px 0 rgba(255,255,255,${isFocused ? 0.1 : 0.07})`;
    return `${ring}, ${drop}, ${highlight}`;
  })();
  const shouldTrackCalendarHover = !isPlaceholder && Boolean(event._id);
  const handleEventMouseDown = (
    selectedEvent: Schema_GridEvent,
    e: MouseEvent,
  ) => {
    if (isWeekInteractionMotionActive()) {
      return;
    }

    if (isRightClick(e)) {
      // Ignores right click here so it can pass through to context menu
      return;
    }

    if (!onEventMouseDown) {
      e.stopPropagation();
      return;
    }

    onEventMouseDown(selectedEvent, e);
  };

  return (
    <CalendarTimedEventCard
      onBlur={isDeck ? () => setIsFocused(false) : undefined}
      boxShadow={deckBoxShadow}
      displayMode={displayMode}
      event={event}
      onFocus={isDeck ? () => setIsFocused(true) : undefined}
      interactionAttributes={interactionAttributes}
      isCommitAcknowledged={shouldAcknowledgeCommit}
      motionMode={motionMode}
      onEventKeyDown={onEventKeyDown}
      onEventMouseDown={handleEventMouseDown}
      onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
        if (!shouldTrackCalendarHover) return;

        setHoveredCalendarEventTarget(e.currentTarget);
      }}
      onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
        clearHoveredCalendarEventTarget(e.currentTarget);
      }}
      onScalerMouseDown={onScalerMouseDown}
      position={{ ...position, zIndex }}
      ref={ref}
    />
  );
};

export const GridEvent = forwardRef(GridEventBase);
export const GridEventMemo = memo(GridEvent, (prev, next) => {
  return (
    prev.displayMode === next.displayMode &&
    prev.deckLayout === next.deckLayout &&
    prev.event === next.event &&
    prev.interactionAttributes === next.interactionAttributes &&
    prev.measurements === next.measurements &&
    prev.motionMode === next.motionMode &&
    // The visible window can move without the event or measurements changing
    prev.weekProps.component.weekDays === next.weekProps.component.weekDays
  );
});
