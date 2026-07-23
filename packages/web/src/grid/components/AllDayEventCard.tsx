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
import { brighten, darken, isDark } from "@web/common/styles/color.utils";
import { theme } from "@web/common/styles/theme";
import { useEventPalette } from "@web/common/styles/theme.util";
import { type GridEvent } from "@web/common/types/web.event.types";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { EVENT_RESIZE_HANDLE_ATTRIBUTE } from "@web/grid/interaction/dom";
import { type EventPosition } from "@web/grid/types/grid.types";
import { EventRepeatIcon } from "./EventRepeatIcon";

const REPEAT_ICON_MIN_WIDTH = 60;

export interface AllDayEventCardProps {
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
  position: EventPosition;
}

const AllDayEventCardBase = (
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
  }: AllDayEventCardProps,
  ref: ForwardedRef<HTMLDivElement>,
) => {
  const { base: baseColor, hover: hoverColor } = useEventPalette();
  const isInPast = dayjs().isAfter(dayjs(event.endDate));
  const isRecurring = isRecurringEvent(event);
  const showRepeatIcon =
    isRecurring && !isPlaceholder && position.width >= REPEAT_ICON_MIN_WIDTH;
  // Past events recede in the direction of the theme's grid, matching
  // TimedEventCard: the dark theme's light steel fill dims slightly, the
  // light theme's ink fill fades toward the paper. Only the fill moves — a
  // `brightness()` filter would drag the title text along with it and let
  // past events fall below the 4.5:1 contrast minimum.
  const bgColor = isInPast
    ? isDark(baseColor)
      ? brighten(baseColor, 14)
      : darken(baseColor, 5)
    : baseColor;
  // isInPast is excluded here (falls through to bgColor) so a past event
  // stays dimmed on hover instead of snapping to full brightness.
  const hoverBgColor = !isPlaceholder && !isInPast ? hoverColor : bgColor;
  // Chosen per-fill (whichever of dark/light reads better) rather than a fixed
  // color, matching TimedEventCard, so a future fill/darken tweak can't quietly
  // drop the title below 4.5:1.
  const titleColor = theme.getContrastText(bgColor);

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
  const baseAccessibleLabel = `${isRecurring ? "Recurring " : ""}${event.isDemo ? "Sample " : ""}All-day event: ${event.title || "Untitled event"}`;
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
        "absolute min-h-2.5 select-none overflow-hidden rounded-xs bg-(--event-bg) pr-0.75 pl-1.25 transition-[background-color,filter] duration-260 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-(--event-hover-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        {
          "hover:cursor-pointer": !isPlaceholder,
          "outline outline-1 outline-dashed outline-text-muted/50":
            event.isDemo,
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
          className="relative min-w-0 truncate text-xs"
          style={{ color: titleColor }}
        >
          {event.title}
          <SpaceCharacter />
        </span>
      </div>
      {showRepeatIcon && <EventRepeatIcon baseColor={bgColor} />}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Resize handles are pointer-only drag targets hidden from assistive tech. */}
      <div
        aria-hidden="true"
        role="presentation"
        {...{ [EVENT_RESIZE_HANDLE_ATTRIBUTE]: "startDate" }}
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
        {...{ [EVENT_RESIZE_HANDLE_ATTRIBUTE]: "endDate" }}
        style={scalerStyle({ right: "-0.25px" })}
        onMouseDown={(e) => {
          e.stopPropagation();
          onScalerMouseDown?.(event, e, "endDate");
        }}
      />
    </div>
  );
};

export const AllDayEventCard = forwardRef(AllDayEventCardBase);
