import cn from "classnames";
import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  memo,
  useMemo,
  useState,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import { brighten, darken } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";
import {
  DATA_EVENT_ELEMENT_ID,
  ZIndex,
} from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import {
  gridColorByPriority,
  gridHoverColorByPriority,
} from "@web/common/styles/theme.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import { getLineClamp } from "@web/common/utils/grid/grid.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { getEventPosition } from "@web/common/utils/position/position.util";
import { Flex } from "@web/components/Flex";
import {
  AlignItems,
  FlexDirections,
  FlexWrap,
} from "@web/components/Flex/styled";
import { useSomedayCommitAcknowledgement } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/state/somedayCommitAcknowledgementState";
import { Text } from "@web/components/Text";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { isWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import {
  clearHoveredCalendarEventTarget,
  setHoveredCalendarEventTarget,
} from "@web/views/Week/interaction/targeting/weekCalendarEventTargeting";
import {
  GRID_EVENT_TIME_LABEL_FONT_SIZE,
  GRID_EVENT_TIME_LABEL_OPACITY,
  GRID_EVENT_TITLE_LINE_HEIGHT,
  MIN_EVENT_HEIGHT_FOR_TIME_LABEL,
  MIN_EVENT_WIDTH_FOR_TIME_LABEL,
} from "@web/views/Week/layout.constants";
import {
  applyWeekTimedDeckPosition,
  type WeekTimedDeckLayout,
} from "@web/views/Week/utils/weekTimedOverlapLayout";

interface Props {
  deckLayout?: WeekTimedDeckLayout | null;
  displayMode: GridEventDisplayMode;
  event: Schema_GridEvent;
  interactionAttributes?: Record<string, string | undefined>;
  isPending?: boolean;
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
    isPending = false,
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
  const isInPast = dayjs().isAfter(dayjs(_event.endDate));
  const event = _event;
  const isDeck = Boolean(deckLayout) && !isDraft;
  const [isFocused, setIsFocused] = useState(false);
  const shouldAcknowledgeCommit =
    useSomedayCommitAcknowledgement(event._id) &&
    !isDragging &&
    !isResizing &&
    !isPlaceholder &&
    !isDraft;

  const basePosition = getEventPosition(
    event,
    component.startOfView,
    component.endOfView,
    measurements,
    isDraft,
  );
  const position =
    !isDraft && deckLayout
      ? applyWeekTimedDeckPosition(basePosition, deckLayout)
      : basePosition;

  const lineClamp = useMemo(
    () => getLineClamp(position.height),
    [position.height],
  );
  const isTallEnoughForTimeLabel =
    position.height >= MIN_EVENT_HEIGHT_FOR_TIME_LABEL;
  const isWideEnoughForTimeLabel =
    position.width >= MIN_EVENT_WIDTH_FOR_TIME_LABEL;
  const shouldAnimatePastCommitTimeOut =
    shouldAcknowledgeCommit && isInPast && !isDraft && isTallEnoughForTimeLabel;

  const priority = event.priority || Priorities.UNASSIGNED;
  const baseColor = gridColorByPriority[priority];
  const draftColor = darken(baseColor, 18);
  const hoverColor = gridHoverColorByPriority[priority];

  const bgColor = (() => {
    if (isDraft) return draftColor;
    if (shouldAcknowledgeCommit) return hoverColor;
    if (isResizing || isDragging) return brighten(baseColor);
    return baseColor;
  })();

  const hoverBgColor =
    !isDraft && !isPlaceholder && !isResizing
      ? isPending && bgColor
        ? darken(bgColor)
        : hoverColor
      : bgColor;

  const hoverCursorClass =
    !isPlaceholder && !isResizing
      ? isDragging
        ? "hover:cursor-move"
        : isPending
          ? "hover:cursor-wait"
          : "hover:cursor-pointer"
      : "";

  const shouldFloatAboveDeck =
    isDraft || isDragging || isResizing || (isDeck && isFocused);
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

  const eventStyle = {
    "--event-bg": bgColor,
    "--event-hover-bg": hoverBgColor,
    height: position.height || 0,
    left: position.left,
    opacity: isPlaceholder ? 0.5 : undefined,
    top: position.top,
    width: position.width || 0,
    zIndex,
    boxShadow: deckBoxShadow,
    filter: isDraft
      ? "drop-shadow(2px 4px 4px black)"
      : isInPast
        ? "brightness(0.7)"
        : "brightness(1)",
  } as CSSProperties;

  const titleStyle: CSSProperties = {
    fontSize: position.height <= 15 ? "10px" : "13px",
    lineHeight: position.height <= 15 ? "1.1" : GRID_EVENT_TITLE_LINE_HEIGHT,
    minHeight: "3px",
    display: "-webkit-box",
    overflow: "hidden",
    textOverflow: "ellipsis",
    wordBreak: "break-all",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lineClamp,
  };

  const timeLabelStyle: CSSProperties = {
    fontSize: GRID_EVENT_TIME_LABEL_FONT_SIZE,
    opacity: GRID_EVENT_TIME_LABEL_OPACITY,
    whiteSpace: "nowrap",
  };

  const showResizeCursor =
    !isPlaceholder && !isResizing && !isDragging && !isPending;
  const scalerStyle = (
    placement: Pick<CSSProperties, "top" | "bottom">,
  ): CSSProperties => ({
    position: "absolute",
    width: "100%",
    height: "4.5px",
    opacity: 0,
    left: 0,
    zIndex: ZIndex.LAYER_4,
    cursor: showResizeCursor ? "row-resize" : undefined,
    ...placement,
  });
  const eventTitle = event.title || "Untitled event";
  const timeRange =
    !event.isAllDay && event.startDate && event.endDate
      ? getTimesLabel(event.startDate, event.endDate)
      : null;
  const accessibleLabel = event.isAllDay
    ? `All-day event: ${eventTitle}`
    : `Timed event: ${eventTitle}, ${timeRange ?? "time not set"}`;
  const shouldTrackCalendarHover =
    !isPending && !isPlaceholder && Boolean(event._id);

  return (
    // biome-ignore lint/a11y/useSemanticElements: Grid events are draggable/resizable blocks, not native buttons.
    <div
      {...{ [DATA_EVENT_ELEMENT_ID]: event._id }}
      {...interactionAttributes}
      aria-disabled={isPending ? "true" : undefined}
      aria-label={accessibleLabel}
      ref={ref}
      role="button"
      tabIndex={0}
      className={cn(
        "absolute min-h-2.5 select-none overflow-hidden rounded-xs bg-(--event-bg) pr-0.75 pl-1.25 transition-[background-color,filter] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-(--event-hover-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        {
          "animate-someday-commit-acknowledge": shouldAcknowledgeCommit,
        },
        hoverCursorClass,
      )}
      style={eventStyle}
      onMouseDown={(e: MouseEvent) => {
        if (isWeekInteractionMotionActive()) {
          return;
        }

        if (isRightClick(e)) {
          // Ignores right click here so it can pass through to context menu
          return;
        }

        // Prevent drag/resize if event is pending (waiting for backend confirmation)
        if (isPending) {
          return;
        }

        if (!onEventMouseDown) {
          e.stopPropagation();
          return;
        }

        onEventMouseDown(event, e);
      }}
      onFocus={isDeck ? () => setIsFocused(true) : undefined}
      onBlur={isDeck ? () => setIsFocused(false) : undefined}
      onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
        if (!shouldTrackCalendarHover) return;

        setHoveredCalendarEventTarget(e.currentTarget);
      }}
      onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
        clearHoveredCalendarEventTarget(e.currentTarget);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (!onEventKeyDown || (e.key !== "Enter" && e.key !== " ")) {
          return;
        }

        e.preventDefault();
        onEventKeyDown?.(event);
      }}
    >
      <Flex
        alignItems={AlignItems.FLEX_START}
        direction={FlexDirections.COLUMN}
        flexWrap={FlexWrap.WRAP}
      >
        <span style={titleStyle}>{event.title}</span>
        {!event.isAllDay && (
          <>
            {(isDraft || !isInPast || shouldAnimatePastCommitTimeOut) &&
              isTallEnoughForTimeLabel &&
              isWideEnoughForTimeLabel && (
                <Text
                  aria-hidden={shouldAnimatePastCommitTimeOut || undefined}
                  className={cn({
                    "animate-someday-commit-time-exit opacity-0":
                      shouldAnimatePastCommitTimeOut,
                  })}
                  data-week-event-time-label="true"
                  style={timeLabelStyle}
                  zIndex={ZIndex.LAYER_3}
                >
                  {timeRange}
                </Text>
              )}
            <div
              aria-hidden="true"
              data-week-event-resize-handle="startDate"
              style={scalerStyle({ top: "-0.25px" })}
              onMouseDown={(e) => {
                e.stopPropagation();
                onScalerMouseDown?.(event, e, "startDate");
              }}
            />
            <div
              aria-hidden="true"
              data-week-event-resize-handle="endDate"
              style={scalerStyle({ bottom: "-0.25px" })}
              onMouseDown={(e) => {
                e.stopPropagation();
                onScalerMouseDown?.(event, e, "endDate");
              }}
            />
          </>
        )}
      </Flex>
    </div>
  );
};

export const GridEvent = forwardRef(GridEventBase);
export const GridEventMemo = memo(GridEvent, (prev, next) => {
  return (
    prev.displayMode === next.displayMode &&
    prev.deckLayout === next.deckLayout &&
    prev.event === next.event &&
    prev.interactionAttributes === next.interactionAttributes &&
    prev.isPending === next.isPending &&
    prev.measurements === next.measurements &&
    prev.motionMode === next.motionMode
  );
});
