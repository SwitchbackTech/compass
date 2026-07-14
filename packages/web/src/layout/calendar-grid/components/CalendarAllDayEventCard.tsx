import cn from "classnames";
import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import dayjs from "@core/util/date/dayjs";
import { isRecurringEvent } from "@core/util/event/event.util";
import { type CalendarCardIdentity } from "@web/calendars/useCalendarLookup";
import {
  DATA_EVENT_ELEMENT_ID,
  ZIndex,
} from "@web/common/constants/web.constants";
import { darken, isDark } from "@web/common/styles/color.utils";
import { EVENT_COLOR, EVENT_HOVER_COLOR } from "@web/common/styles/theme.util";
import { type GridEvent } from "@web/common/types/web.event.types";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { CALENDAR_EVENT_RESIZE_HANDLE_ATTRIBUTE } from "@web/layout/calendar-grid/interaction/calendarInteractionDom";
import { type CalendarEventPosition } from "@web/layout/calendar-grid/types/calendarGrid.types";
import { GridEventRepeatIcon } from "./GridEventRepeatIcon";

const REPEAT_ICON_MIN_WIDTH = 60;

export interface CalendarAllDayEventCardProps {
  /** Resolved by a list-level useCalendarLookup call, not fetched here. */
  calendarIdentity?: CalendarCardIdentity | null;
  event: GridEvent;
  interactionAttributes?: Record<string, string | undefined>;
  isPlaceholder: boolean;
  onEventKeyDown?: (event: GridEvent) => void;
  onEventMouseDown?: (e: MouseEvent, event: GridEvent) => void;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
  onScalerMouseDown?: (
    event: GridEvent,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
  position: CalendarEventPosition;
}

const CalendarAllDayEventCardBase = (
  {
    calendarIdentity = null,
    event,
    interactionAttributes,
    isPlaceholder,
    onEventKeyDown,
    onEventMouseDown,
    onMouseEnter,
    onMouseLeave,
    onScalerMouseDown,
    position,
  }: CalendarAllDayEventCardProps,
  ref: ForwardedRef<HTMLDivElement>,
) => {
  const baseColor = EVENT_COLOR;
  const hoverColor = EVENT_HOVER_COLOR;
  const isInPast = dayjs().isAfter(dayjs(event.endDate));
  const isRecurring = isRecurringEvent(event);
  const showRepeatIcon =
    isRecurring && !isPlaceholder && position.width >= REPEAT_ICON_MIN_WIDTH;
  // A `brightness()` filter would scale the title text toward black right
  // along with the fill, which is what let past events fall below the 4.5:1
  // contrast minimum. Darkening only the fill keeps the (fixed) title color's
  // contrast ratio intact.
  const bgColor = isInPast ? darken(baseColor, 5) : baseColor;
  // isInPast is excluded here (falls through to bgColor) so a past event
  // stays dimmed on hover instead of snapping to full brightness.
  const hoverBgColor = !isPlaceholder && !isInPast ? hoverColor : bgColor;
  // The fill only ever gets darkened for past events, never lightened, but
  // check dynamically (matching CalendarTimedEventCard) rather than assuming
  // a fixed dark title color stays safe if the fill or darken amount changes.
  const titleColorClassName = isDark(bgColor)
    ? "text-text-lighter"
    : "text-text-dark";

  const eventStyle = {
    "--event-bg": bgColor,
    "--event-hover-bg": hoverBgColor,
    height: position.height,
    left: position.left,
    opacity: isPlaceholder ? 0.5 : undefined,
    top: position.top,
    width: position.width,
    zIndex: position.zIndex ?? ZIndex.LAYER_1,
  } as CSSProperties;

  const showResizeCursor = !isPlaceholder;
  const scalerStyle = (
    placement: Pick<CSSProperties, "left" | "right">,
  ): CSSProperties => ({
    position: "absolute",
    width: "4.5px",
    height: "100%",
    opacity: 0,
    top: 0,
    zIndex: ZIndex.LAYER_4,
    cursor: showResizeCursor ? "col-resize" : undefined,
    ...placement,
  });
  const baseAccessibleLabel = `${isRecurring ? "Recurring " : ""}All-day event: ${event.title || "Untitled event"}`;
  // Fill stays a flat neutral color; the accent + this suffix are the only
  // calendar signal, and the name (never color alone) is what makes it
  // accessible (A9).
  const accessibleLabel = calendarIdentity
    ? `${baseAccessibleLabel}, ${calendarIdentity.name} calendar`
    : baseAccessibleLabel;

  return (
    // biome-ignore lint/a11y/useSemanticElements: All-day events are draggable/resizable blocks, not native buttons.
    <div
      {...{ [DATA_EVENT_ELEMENT_ID]: event._id }}
      {...interactionAttributes}
      aria-label={accessibleLabel}
      ref={ref}
      role="button"
      tabIndex={0}
      className={cn(
        "absolute min-h-2.5 select-none overflow-hidden rounded-xs bg-(--event-bg) pr-0.75 pl-1.25 transition-[background-color,filter] duration-260 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-(--event-hover-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        {
          "hover:cursor-pointer": !isPlaceholder,
        },
      )}
      style={eventStyle}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Enter" && e.key !== " ") {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        onEventKeyDown?.(event);
      }}
      onMouseDown={(e: MouseEvent) => {
        if (!onEventMouseDown) {
          e.stopPropagation();
          return;
        }

        onEventMouseDown(e, event);
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
        className={cn("flex min-w-0 items-center", {
          // Reserve room so a long title truncates before the bottom-right icon.
          "pr-3.5": showRepeatIcon,
        })}
      >
        <span
          className={cn(
            "relative min-w-0 truncate text-xs",
            titleColorClassName,
          )}
        >
          {event.title}
          <SpaceCharacter />
        </span>
      </div>
      {showRepeatIcon && <GridEventRepeatIcon baseColor={bgColor} />}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Resize handles are pointer-only drag targets hidden from assistive tech. */}
      <div
        aria-hidden="true"
        role="presentation"
        {...{ [CALENDAR_EVENT_RESIZE_HANDLE_ATTRIBUTE]: "startDate" }}
        style={scalerStyle({ left: "-0.25px" })}
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
        style={scalerStyle({ right: "-0.25px" })}
        onMouseDown={(e) => {
          e.stopPropagation();
          onScalerMouseDown?.(event, e, "endDate");
        }}
      />
    </div>
  );
};

export const CalendarAllDayEventCard = forwardRef(CalendarAllDayEventCardBase);
