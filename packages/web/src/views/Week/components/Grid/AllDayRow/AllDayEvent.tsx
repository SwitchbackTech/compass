import cn from "classnames";
import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  memo,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import { darken } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";
import {
  DATA_EVENT_ELEMENT_ID,
  ZIndex,
} from "@web/common/constants/web.constants";
import {
  gridColorByPriority,
  gridHoverColorByPriority,
} from "@web/common/styles/theme.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getEventPosition } from "@web/common/utils/position/position.util";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { useSomedayCommitAcknowledgement } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/state/somedayCommitAcknowledgementState";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  clearHoveredCalendarEventTarget,
  setHoveredCalendarEventTarget,
} from "@web/views/Week/interaction/targeting/weekCalendarEventTargeting";

interface Props {
  event: Schema_GridEvent;
  interactionAttributes?: Record<string, string | undefined>;
  isPending?: boolean;
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfView"];
  endOfView: WeekProps["component"]["endOfView"];
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
    isPending = false,
    isPlaceholder,
    measurements,
    startOfView,
    endOfView,
    onMouseDown,
    onKeyDown,
    onScalerMouseDown,
  }: Props,
  ref: ForwardedRef<HTMLDivElement>,
) => {
  const position = getEventPosition(
    event,
    startOfView,
    endOfView,
    measurements,
    false,
  );

  const priority = event.priority || Priorities.UNASSIGNED;
  const baseColor = gridColorByPriority[priority];
  const hoverColor = gridHoverColorByPriority[priority];
  const isInPast = dayjs().isAfter(dayjs(event.endDate));
  const shouldAcknowledgeCommit =
    useSomedayCommitAcknowledgement(event._id) && !isPlaceholder && !isPending;
  // When isPlaceholder, hover produces no visible change
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
    "--event-bg": shouldAcknowledgeCommit ? hoverColor : baseColor,
    "--event-hover-bg": hoverBgColor,
    height: position.height,
    left: position.left,
    opacity: isPlaceholder ? 0.5 : undefined,
    top: position.top,
    width: position.width,
    zIndex: ZIndex.LAYER_1,
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
  const shouldTrackCalendarHover =
    !isPending && !isPlaceholder && Boolean(event._id);

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
          "animate-someday-commit-acknowledge": shouldAcknowledgeCommit,
        },
        hoverCursorClass,
      )}
      style={eventStyle}
      onMouseDown={(e: MouseEvent) => {
        // Prevent drag/resize if event is pending (waiting for backend confirmation)
        if (isPending) {
          return;
        }

        if (!onMouseDown) {
          e.stopPropagation();
          return;
        }

        onMouseDown(e, event);
      }}
      onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
        if (!shouldTrackCalendarHover) return;

        setHoveredCalendarEventTarget(e.currentTarget);
      }}
      onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
        clearHoveredCalendarEventTarget(e.currentTarget);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Enter" && e.key !== " ") {
          return;
        }

        e.preventDefault();
        onKeyDown?.(event);
      }}
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
      <div
        aria-hidden="true"
        data-week-event-resize-handle="startDate"
        style={scalerStyle({ left: "-0.25px" })}
        onMouseDown={(e) => {
          e.stopPropagation();
          onScalerMouseDown?.(event, e, "startDate");
        }}
      />
      <div
        aria-hidden="true"
        data-week-event-resize-handle="endDate"
        style={scalerStyle({ right: "-0.25px" })}
        onMouseDown={(e) => {
          e.stopPropagation();
          onScalerMouseDown?.(event, e, "endDate");
        }}
      />
    </div>
  );
};

const AllDayEvent = forwardRef(AllDayEventBase);

export const AllDayEventMemo = memo(AllDayEvent, (prev, next) => {
  return (
    prev.event === next.event &&
    prev.interactionAttributes === next.interactionAttributes &&
    prev.isPending === next.isPending &&
    prev.isPlaceholder === next.isPlaceholder &&
    prev.measurements === next.measurements
  );
});
