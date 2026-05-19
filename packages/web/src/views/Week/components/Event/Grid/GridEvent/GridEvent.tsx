import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  memo,
  useMemo,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import { brighten, darken } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";
import {
  DATA_EVENT_ELEMENT_ID,
  ZIndex,
} from "@web/common/constants/web.constants";
import {
  colorByPriority,
  hoverColorByPriority,
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
import { Text } from "@web/components/Text";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { isWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import { MIN_EVENT_HEIGHT_FOR_TIME_LABEL } from "@web/views/Week/layout.constants";

interface Props {
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

  const position = getEventPosition(
    event,
    component.startOfView,
    component.endOfView,
    measurements,
    isDraft,
  );

  const lineClamp = useMemo(
    () => getLineClamp(position.height),
    [position.height],
  );

  const priority = event.priority || Priorities.UNASSIGNED;
  const baseColor = colorByPriority[priority];
  const hoverColor = hoverColorByPriority[priority];

  const bgColor = (() => {
    if (isDraft) return hoverColor;
    if (isResizing || isDragging) return brighten(baseColor);
    return baseColor;
  })();

  // When isPlaceholder or isResizing, hover produces no visible change
  const hoverBgColor =
    !isPlaceholder && !isResizing
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
    zIndex: isDragging ? ZIndex.LAYER_5 : ZIndex.LAYER_1,
    filter: isDraft
      ? "drop-shadow(2px 4px 4px black)"
      : isInPast
        ? "brightness(0.7)"
        : "brightness(1)",
  } as CSSProperties;

  const titleStyle: CSSProperties = {
    fontSize: position.height <= 15 ? "10px" : "13px",
    lineHeight: position.height <= 15 ? "1.1" : undefined,
    minHeight: "3px",
    display: "-webkit-box",
    overflow: "hidden",
    textOverflow: "ellipsis",
    wordBreak: "break-all",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lineClamp,
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

  return (
    // biome-ignore lint/a11y/useSemanticElements: Grid events are draggable/resizable blocks, not native buttons.
    <div
      {...{ [DATA_EVENT_ELEMENT_ID]: event._id }}
      {...interactionAttributes}
      ref={ref}
      role="button"
      tabIndex={0}
      className={`absolute min-h-2.5 select-none overflow-hidden rounded-xs bg-(--event-bg) pr-0.75 pl-1.25 transition-[background-color] duration-350 ease-linear hover:bg-(--event-hover-bg) ${hoverCursorClass}`}
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
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Enter" && e.key !== " ") {
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
            {(isDraft || !isInPast) &&
              position.height >= MIN_EVENT_HEIGHT_FOR_TIME_LABEL && (
                <Text role="textbox" size="xs" zIndex={ZIndex.LAYER_3}>
                  {event.startDate &&
                    event.endDate &&
                    getTimesLabel(event.startDate, event.endDate)}
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
    prev.event === next.event &&
    prev.interactionAttributes === next.interactionAttributes &&
    prev.isPending === next.isPending &&
    prev.measurements === next.measurements &&
    prev.motionMode === next.motionMode
  );
});
