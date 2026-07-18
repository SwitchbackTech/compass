import cn from "classnames";
import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  useMemo,
} from "react";
import dayjs from "@core/util/date/dayjs";
import { isRecurringEvent } from "@core/util/event/event.util";
import { type CalendarCardIdentity } from "@web/calendars/useCalendarLookup";
import {
  DATA_EVENT_ELEMENT_ID,
  ZIndex,
} from "@web/common/constants/web.constants";
import { brighten, darken, isDark } from "@web/common/styles/color.utils";
import { EVENT_COLOR, EVENT_HOVER_COLOR } from "@web/common/styles/theme.util";
import { type GridEvent } from "@web/common/types/web.event.types";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import { getLineClamp } from "@web/common/utils/grid/grid.util";
import {
  GRID_EVENT_TIME_LABEL_FONT_SIZE,
  GRID_EVENT_TIME_LABEL_LINE_HEIGHT,
  GRID_EVENT_TIME_LABEL_OPACITY,
  GRID_EVENT_TITLE_LINE_HEIGHT,
  MIN_EVENT_HEIGHT_FOR_TIME_LABEL,
  MIN_EVENT_WIDTH_FOR_TIME_LABEL,
} from "@web/grid/grid.constants";
import {
  EVENT_CONTENT_ATTRIBUTE,
  EVENT_RESIZE_HANDLE_ATTRIBUTE,
  EVENT_TIME_LABEL_ATTRIBUTE,
} from "@web/grid/interaction/dom";
import { type EventPosition } from "@web/grid/types/grid.types";
import { EventRepeatIcon } from "./EventRepeatIcon";

// Gate the repeat indicator on the event's duration, not its rendered pixel
// height: a true 15-minute event and one resized down to 15 minutes are laid
// out through different height paths that straddle a pixel threshold, so the
// same 15-minute event would show the icon in one case and hide it in the
// other. Duration is the same regardless of render path. 15 min is the minimum
// event length, so every recurring timed event qualifies.
const REPEAT_ICON_MIN_DURATION_MINUTES = 15;
const REPEAT_ICON_MIN_WIDTH = 40;

interface TimedEventCardProps {
  boxShadow?: CSSProperties["boxShadow"];
  /** Resolved by a list-level useCalendarLookup call, not fetched here. */
  calendarIdentity?: CalendarCardIdentity | null;
  displayMode: "draft" | "placeholder" | "saved";
  event: GridEvent;
  interactionAttributes?: Record<string, string | undefined>;
  isSelected?: boolean;
  motionMode: "dragging" | "idle" | "resizing";
  onBlur?: () => void;
  onEventKeyDown?: (event: GridEvent) => void;
  onEventMouseDown?: (event: GridEvent, e: MouseEvent) => void;
  onFocus?: () => void;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
  onScalerMouseDown?: (
    event: GridEvent,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
  position: EventPosition;
}

const TimedEventCardBase = (
  {
    boxShadow,
    calendarIdentity = null,
    displayMode,
    event,
    interactionAttributes,
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
  }: TimedEventCardProps,
  ref: ForwardedRef<HTMLDivElement>,
) => {
  const isDraft = displayMode === "draft";
  const isDragging = motionMode === "dragging";
  const isPlaceholder = displayMode === "placeholder";
  const isResizing = motionMode === "resizing";
  const isInPast = dayjs().isAfter(dayjs(event.endDate));
  const isRecurring = isRecurringEvent(event);
  const durationMinutes = dayjs(event.endDate).diff(
    dayjs(event.startDate),
    "minute",
  );
  const showRepeatIcon =
    isRecurring &&
    !isPlaceholder &&
    durationMinutes >= REPEAT_ICON_MIN_DURATION_MINUTES &&
    position.width >= REPEAT_ICON_MIN_WIDTH;

  const showTimeLabel =
    !event.isAllDay &&
    (isDraft || !isInPast) &&
    position.height >= MIN_EVENT_HEIGHT_FOR_TIME_LABEL &&
    position.width >= MIN_EVENT_WIDTH_FOR_TIME_LABEL;

  // Clamp the title against the height the label leaves behind, not the whole
  // card. Clamping against the full height lets a wrapping title occupy every
  // line the card has and shove the label past the card's clipped edge.
  const lineClamp = useMemo(
    () =>
      getLineClamp(
        showTimeLabel
          ? position.height - GRID_EVENT_TIME_LABEL_LINE_HEIGHT
          : position.height,
      ),
    [position.height, showTimeLabel],
  );

  const baseColor = EVENT_COLOR;
  const draftColor = darken(baseColor, 18);
  // A `brightness()` filter would scale the title text toward black right
  // along with the fill, which is what let past events fall below the 4.5:1
  // contrast minimum. Darkening only the fill keeps the (fixed) title color's
  // contrast ratio intact.
  const pastColor = darken(baseColor, 5);
  const hoverColor = EVENT_HOVER_COLOR;
  const selectedBoxShadow = "0 0 0 1px rgba(255,255,255,0.55)";

  const bgColor = (() => {
    if (isDraft) return draftColor;
    if (isResizing || isDragging) return brighten(baseColor);
    if (isInPast) return pastColor;
    return baseColor;
  })();
  const eventBoxShadow = isSelected
    ? boxShadow
      ? `${selectedBoxShadow}, ${boxShadow}`
      : selectedBoxShadow
    : boxShadow;

  // isInPast is excluded here (falls through to bgColor, i.e. pastColor) so
  // a past event stays dimmed on hover instead of snapping to full brightness.
  const hoverBgColor =
    !isDraft && !isPlaceholder && !isResizing && !isInPast
      ? hoverColor
      : bgColor;
  // The fill is neutral and its lightness swings widely across states (the
  // draft overlay in particular darkens far more than the others), so the
  // title needs a text color chosen per-state rather than one fixed value to
  // keep 4.5:1+ contrast against every fill.
  const titleColorClassName = isDark(bgColor) ? "text-text" : "text-on-accent";

  const eventStyle = {
    "--event-bg": bgColor,
    "--event-hover-bg": hoverBgColor,
    height: position.height || 0,
    left: position.left,
    opacity: isPlaceholder ? 0.5 : undefined,
    top: position.top,
    width: position.width || 0,
    zIndex: position.zIndex ?? ZIndex.LAYER_1,
    boxShadow: eventBoxShadow,
    filter: isDraft ? "drop-shadow(2px 4px 4px black)" : undefined,
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

  const showResizeCursor = !isPlaceholder && !isResizing && !isDragging;

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
  const recurringPrefix = isRecurring ? "Recurring " : "";
  const baseAccessibleLabel = event.isAllDay
    ? `${recurringPrefix}All-day event: ${eventTitle}`
    : `${recurringPrefix}Timed event: ${eventTitle}, ${timeRange ?? "time not set"}`;
  // Fill stays a flat neutral color; the accent + this suffix are the only
  // calendar signal, and the name (never color alone) is what makes it
  // accessible (A9).
  const accessibleLabel = calendarIdentity
    ? `${baseAccessibleLabel}, ${calendarIdentity.name} calendar`
    : baseAccessibleLabel;

  return (
    // biome-ignore lint/a11y/useSemanticElements: Grid events are draggable/resizable blocks, not native buttons.
    <div
      {...{ [DATA_EVENT_ELEMENT_ID]: event._id }}
      {...interactionAttributes}
      aria-label={accessibleLabel}
      ref={ref}
      role="button"
      tabIndex={0}
      className={cn(
        "absolute min-h-2.5 select-none overflow-hidden rounded-xs pr-0.75 pl-1.25 transition-[background-color,filter] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "bg-(--event-bg) hover:bg-(--event-hover-bg)",
        "hover:cursor-pointer",
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
        if (!onEventKeyDown) {
          return;
        }

        onEventKeyDown(event);
      }}
      onMouseDown={(e: MouseEvent) => {
        if (!onEventMouseDown) {
          e.stopPropagation();
          return;
        }

        onEventMouseDown(event, e);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {calendarIdentity && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: calendarIdentity.backgroundColor }}
        />
      )}
      <div
        className="flex flex-col flex-wrap items-start"
        {...{ [EVENT_CONTENT_ATTRIBUTE]: "true" }}
      >
        <span className={titleColorClassName} style={titleStyle}>
          {event.title}
        </span>
        {!event.isAllDay && (
          <>
            {showTimeLabel && (
              <span
                className="relative"
                {...{ [EVENT_TIME_LABEL_ATTRIBUTE]: "true" }}
                style={{ ...timeLabelStyle, zIndex: ZIndex.LAYER_3 }}
              >
                {timeRange}
              </span>
            )}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Resize handles are pointer-only drag targets hidden from assistive tech. */}
            <div
              aria-hidden="true"
              role="presentation"
              {...{ [EVENT_RESIZE_HANDLE_ATTRIBUTE]: "startDate" }}
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
              {...{ [EVENT_RESIZE_HANDLE_ATTRIBUTE]: "endDate" }}
              style={scalerStyle({ bottom: "-0.25px" })}
              onMouseDown={(e) => {
                e.stopPropagation();
                onScalerMouseDown?.(event, e, "endDate");
              }}
            />
          </>
        )}
      </div>
      {showRepeatIcon && <EventRepeatIcon baseColor={bgColor} />}
    </div>
  );
};

export const TimedEventCard = forwardRef(TimedEventCardBase);
