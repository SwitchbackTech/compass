import {
  type ForwardedRef,
  forwardRef,
  type MouseEvent,
  memo,
  useState,
} from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type CalendarCardIdentity } from "@web/calendars/useCalendarLookup";
import { ZIndex } from "@web/common/constants/web.constants";
import { type GridEvent as GridEventEntity } from "@web/common/types/web.event.types";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { TimedEventCard } from "@web/grid/components/TimedEventCard";
import { getTimedEventPosition } from "@web/grid/layout/event.position";
import {
  applyTimedEventDisplayPosition,
  type TimedDeckLayout,
} from "@web/grid/layout/timed-deck.layout";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { isWeekInteractionMotionActive } from "@web/views/Week/interaction/state/motion.state";

interface Props {
  calendarIdentity?: CalendarCardIdentity | null;
  deckLayout?: TimedDeckLayout | null;
  displayMode: GridEventDisplayMode;
  event: GridEventEntity;
  focusColor?: string | null;
  interactionAttributes?: Record<string, string | undefined>;
  measurements: Measurements_Grid;
  motionMode?: GridEventMotionMode;
  onEventMouseDown?: (event: GridEventEntity, e: MouseEvent) => void;
  onEventKeyDown?: (event: GridEventEntity) => void;
  onScalerMouseDown?: (
    event: GridEventEntity,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
  weekProps: WeekProps;
}

type GridEventDisplayMode = "draft" | "placeholder" | "saved";
type GridEventMotionMode = "dragging" | "idle" | "resizing";

const GridEventBase = (
  {
    calendarIdentity = null,
    deckLayout = null,
    displayMode,
    event: _event,
    focusColor = null,
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
  const basePosition = getTimedEventPosition(event, {
    isDraft: shouldUseDraftSizing,
    measurements,
    visibleDates,
  });
  const position = shouldUseDraftSizing
    ? basePosition
    : applyTimedEventDisplayPosition(basePosition, deckLayout);

  const shouldFloatAboveDeck = isDragging || isResizing || (isDraft && !isDeck);
  const zIndex = shouldFloatAboveDeck
    ? ZIndex.MAX
    : (position.zIndex ?? ZIndex.LAYER_1);

  const deckBoxShadow = (() => {
    if (!isDeck) return undefined;
    const ring = `0 0 0 0.75px var(--background)`;
    const drop = isFocused
      ? "0 6px 14px -3px rgba(0,0,0,0.55)"
      : "0 3px 6px -2px rgba(0,0,0,0.4)";
    const highlight = `inset 0 1px 0 rgba(255,255,255,${isFocused ? 0.1 : 0.07})`;
    return `${ring}, ${drop}, ${highlight}`;
  })();
  const handleEventMouseDown = (
    selectedEvent: GridEventEntity,
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
    <TimedEventCard
      onBlur={isDeck ? () => setIsFocused(false) : undefined}
      boxShadow={deckBoxShadow}
      calendarIdentity={calendarIdentity}
      displayMode={displayMode}
      event={event}
      focusColor={focusColor}
      onFocus={isDeck ? () => setIsFocused(true) : undefined}
      interactionAttributes={interactionAttributes}
      motionMode={motionMode}
      onEventKeyDown={onEventKeyDown}
      onEventMouseDown={handleEventMouseDown}
      onScalerMouseDown={onScalerMouseDown}
      position={{ ...position, zIndex }}
      ref={ref}
    />
  );
};

export const GridEvent = forwardRef(GridEventBase);
export const GridEventMemo = memo(GridEvent, (prev, next) => {
  return (
    prev.calendarIdentity === next.calendarIdentity &&
    prev.displayMode === next.displayMode &&
    prev.deckLayout === next.deckLayout &&
    prev.event === next.event &&
    prev.focusColor === next.focusColor &&
    prev.interactionAttributes === next.interactionAttributes &&
    prev.measurements === next.measurements &&
    prev.motionMode === next.motionMode &&
    // The visible window can move without the event or measurements changing
    prev.weekProps.component.weekDays === next.weekProps.component.weekDays
  );
});
