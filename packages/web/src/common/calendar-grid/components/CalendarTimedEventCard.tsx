import cn from "classnames";
import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  useMemo,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import { brighten, darken } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";
import {
  CALENDAR_GRID_EVENT_TIME_LABEL_FONT_SIZE,
  CALENDAR_GRID_EVENT_TIME_LABEL_OPACITY,
  CALENDAR_GRID_EVENT_TITLE_LINE_HEIGHT,
  CALENDAR_MIN_EVENT_HEIGHT_FOR_TIME_LABEL,
  CALENDAR_MIN_EVENT_WIDTH_FOR_TIME_LABEL,
} from "@web/common/calendar-grid/calendarGrid.constants";
import {
  CALENDAR_EVENT_RESIZE_HANDLE_ATTRIBUTE,
  CALENDAR_EVENT_TIME_LABEL_ATTRIBUTE,
} from "@web/common/calendar-grid/interaction/calendarInteractionDom";
import { type CalendarEventPosition } from "@web/common/calendar-grid/types/calendarGrid.types";
import {
  DATA_EVENT_ELEMENT_ID,
  ZIndex,
} from "@web/common/constants/web.constants";
import {
  gridColorByPriority,
  gridHoverColorByPriority,
} from "@web/common/styles/theme.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import { getLineClamp } from "@web/common/utils/grid/grid.util";
import { Flex } from "@web/components/Flex";
import {
  AlignItems,
  FlexDirections,
  FlexWrap,
} from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";

export interface CalendarTimedEventCardProps {
  boxShadow?: CSSProperties["boxShadow"];
  displayMode: "draft" | "placeholder" | "saved";
  event: Schema_GridEvent;
  interactionAttributes?: Record<string, string | undefined>;
  isCommitAcknowledged?: boolean;
  isPending?: boolean;
  isSelected?: boolean;
  motionMode: "dragging" | "idle" | "resizing";
  onBlur?: () => void;
  onEventKeyDown?: (event: Schema_GridEvent) => void;
  onEventMouseDown?: (event: Schema_GridEvent, e: MouseEvent) => void;
  onFocus?: () => void;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
  onScalerMouseDown?: (
    event: Schema_GridEvent,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
  position: CalendarEventPosition;
}

const CalendarTimedEventCardBase = (
  {
    boxShadow,
    displayMode,
    event,
    interactionAttributes,
    isCommitAcknowledged = false,
    isPending = false,
    isSelected = false,
    motionMode,
    onBlur,
    onEventKeyDown,
    onEventMouseDown,
    onFocus,
    onMouseEnter,
    onMouseLeave,
    onScalerMouseDown,
    position,
  }: CalendarTimedEventCardProps,
  ref: ForwardedRef<HTMLDivElement>,
) => {
  const isDraft = displayMode === "draft";
  const isDragging = motionMode === "dragging";
  const isPlaceholder = displayMode === "placeholder";
  const isResizing = motionMode === "resizing";
  const isInPast = dayjs().isAfter(dayjs(event.endDate));

  const lineClamp = useMemo(
    () => getLineClamp(position.height),
    [position.height],
  );
  const isTallEnoughForTimeLabel =
    position.height >= CALENDAR_MIN_EVENT_HEIGHT_FOR_TIME_LABEL;
  const isWideEnoughForTimeLabel =
    position.width >= CALENDAR_MIN_EVENT_WIDTH_FOR_TIME_LABEL;
  const shouldAnimatePastCommitTimeOut =
    isCommitAcknowledged && isInPast && !isDraft && isTallEnoughForTimeLabel;

  const priority = event.priority || Priorities.UNASSIGNED;
  const baseColor = gridColorByPriority[priority];
  const draftColor = darken(baseColor, 18);
  const hoverColor = gridHoverColorByPriority[priority];

  const bgColor = (() => {
    if (isDraft) return draftColor;
    if (isCommitAcknowledged) return hoverColor;
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

  const eventStyle = {
    "--event-bg": bgColor,
    "--event-hover-bg": hoverBgColor,
    height: position.height || 0,
    left: position.left,
    opacity: isPlaceholder ? 0.5 : undefined,
    top: position.top,
    width: position.width || 0,
    zIndex: position.zIndex ?? ZIndex.LAYER_1,
    boxShadow,
    filter: isDraft
      ? "drop-shadow(2px 4px 4px black)"
      : isInPast
        ? "brightness(0.7)"
        : "brightness(1)",
  } as CSSProperties;

  const titleStyle: CSSProperties = {
    fontSize: position.height <= 15 ? "10px" : "13px",
    lineHeight:
      position.height <= 15 ? "1.1" : CALENDAR_GRID_EVENT_TITLE_LINE_HEIGHT,
    minHeight: "3px",
    display: "-webkit-box",
    overflow: "hidden",
    textOverflow: "ellipsis",
    wordBreak: "break-all",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lineClamp,
  };

  const timeLabelStyle: CSSProperties = {
    fontSize: CALENDAR_GRID_EVENT_TIME_LABEL_FONT_SIZE,
    opacity: CALENDAR_GRID_EVENT_TIME_LABEL_OPACITY,
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
        "absolute min-h-2.5 select-none overflow-hidden rounded-xs pr-0.75 pl-1.25 transition-[background-color,filter] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        isSelected
          ? "bg-event-selected shadow-[0_4px_10px_-4px_#00000080]"
          : "bg-(--event-bg) hover:bg-(--event-hover-bg)",
        {
          "animate-someday-commit-acknowledge": isCommitAcknowledged,
        },
        hoverCursorClass,
      )}
      style={eventStyle}
      onBlur={onBlur}
      onFocus={onFocus}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Enter" && e.key !== " ") {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (isPending || !onEventKeyDown) {
          return;
        }

        onEventKeyDown(event);
      }}
      onMouseDown={(e: MouseEvent) => {
        if (isPending) {
          return;
        }

        if (!onEventMouseDown) {
          e.stopPropagation();
          return;
        }

        onEventMouseDown(event, e);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
                  {...{ [CALENDAR_EVENT_TIME_LABEL_ATTRIBUTE]: "true" }}
                  style={timeLabelStyle}
                  zIndex={ZIndex.LAYER_3}
                >
                  {timeRange}
                </Text>
              )}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Resize handles are pointer-only drag targets hidden from assistive tech. */}
            <div
              aria-hidden="true"
              role="presentation"
              {...{ [CALENDAR_EVENT_RESIZE_HANDLE_ATTRIBUTE]: "startDate" }}
              style={scalerStyle({ top: "-0.25px" })}
              onMouseDown={(e) => {
                e.stopPropagation();
                onScalerMouseDown?.(event, e, "startDate");
              }}
            />
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Resize handles are pointer-only drag targets hidden from assistive tech. */}
            <div
              aria-hidden="true"
              role="presentation"
              {...{ [CALENDAR_EVENT_RESIZE_HANDLE_ATTRIBUTE]: "endDate" }}
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

export const CalendarTimedEventCard = forwardRef(CalendarTimedEventCardBase);
