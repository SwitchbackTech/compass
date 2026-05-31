import cn from "classnames";
import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import { darken } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";
import { CALENDAR_EVENT_RESIZE_HANDLE_ATTRIBUTE } from "@web/common/calendar-grid/interaction/calendarInteractionDom";
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
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";

export interface CalendarAllDayEventCardProps {
  event: Schema_GridEvent;
  interactionAttributes?: Record<string, string | undefined>;
  isCommitAcknowledged?: boolean;
  isPending?: boolean;
  isPlaceholder: boolean;
  onEventKeyDown?: (event: Schema_GridEvent) => void;
  onEventMouseDown?: (e: MouseEvent, event: Schema_GridEvent) => void;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
  onScalerMouseDown?: (
    event: Schema_GridEvent,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
  position: CalendarEventPosition;
}

const CalendarAllDayEventCardBase = (
  {
    event,
    interactionAttributes,
    isCommitAcknowledged = false,
    isPending = false,
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
  const priority = event.priority || Priorities.UNASSIGNED;
  const baseColor = gridColorByPriority[priority];
  const hoverColor = gridHoverColorByPriority[priority];
  const isInPast = dayjs().isAfter(dayjs(event.endDate));
  const hoverBgColor = !isPlaceholder
    ? isPending && baseColor
      ? darken(baseColor)
      : hoverColor
    : baseColor;

  const hoverCursorClass = !isPlaceholder
    ? isPending
      ? "hover:cursor-wait"
      : "hover:cursor-pointer"
    : "";

  const eventStyle = {
    "--event-bg": isCommitAcknowledged ? hoverColor : baseColor,
    "--event-hover-bg": hoverBgColor,
    height: position.height,
    left: position.left,
    opacity: isPlaceholder ? 0.5 : undefined,
    top: position.top,
    width: position.width,
    zIndex: position.zIndex ?? ZIndex.LAYER_1,
    filter: isInPast ? "brightness(0.7)" : "brightness(1)",
  } as CSSProperties;

  const showResizeCursor = !isPlaceholder && !isPending;
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
  const accessibleLabel = `All-day event: ${event.title || "Untitled event"}`;

  return (
    // biome-ignore lint/a11y/useSemanticElements: All-day events are draggable/resizable blocks, not native buttons.
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
          "animate-someday-commit-acknowledge": isCommitAcknowledged,
        },
        hoverCursorClass,
      )}
      style={eventStyle}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Enter" && e.key !== " ") {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (isPending) {
          return;
        }

        onEventKeyDown?.(event);
      }}
      onMouseDown={(e: MouseEvent) => {
        if (isPending) {
          return;
        }

        if (!onEventMouseDown) {
          e.stopPropagation();
          return;
        }

        onEventMouseDown(e, event);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Flex
        alignItems={AlignItems.FLEX_START}
        direction={FlexDirections.COLUMN}
      >
        <Text size="m">
          {event.title}
          <SpaceCharacter />
        </Text>
      </Flex>
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
