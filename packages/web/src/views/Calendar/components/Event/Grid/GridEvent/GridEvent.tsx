import {
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent,
  type MouseEvent,
  forwardRef,
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
import { selectIsEventPending } from "@web/ducks/events/selectors/pending.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { type Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Calendar/hooks/useWeek";

interface Props {
  event: Schema_GridEvent;
  isDraft: boolean;
  isDragging: boolean;
  isPlaceholder: boolean;
  isResizing: boolean;
  measurements: Measurements_Grid;
  onEventMouseDown: (event: Schema_GridEvent, e: MouseEvent) => void;
  onEventKeyDown?: (event: Schema_GridEvent) => void;
  onScalerMouseDown: (
    event: Schema_GridEvent,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
  weekProps: WeekProps;
}

const _GridEvent = (
  {
    event: _event,

    isDraft,
    isDragging,
    isPlaceholder,
    isResizing,
    measurements,
    onEventMouseDown,
    onEventKeyDown,
    onScalerMouseDown,
    weekProps,
  }: Props,
  ref: ForwardedRef<HTMLDivElement>,
) => {
  const { component } = weekProps;

  const isInPast = dayjs().isAfter(dayjs(_event.endDate));
  const event = _event;
  const isPending = useAppSelector((state) =>
    event._id ? selectIsEventPending(state, event._id) : false,
  );

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
    <div
      {...{ [DATA_EVENT_ELEMENT_ID]: event._id }}
      ref={ref}
      role="button"
      tabIndex={0}
      className={`absolute min-h-2.5 overflow-hidden rounded-xs bg-(--event-bg) pr-0.75 pl-1.25 transition-[background-color] duration-350 ease-linear select-none hover:bg-(--event-hover-bg) ${hoverCursorClass}`}
      style={eventStyle}
      onMouseDown={(e: MouseEvent) => {
        if (isRightClick(e)) {
          // Ignores right click here so it can pass through to context menu
          return;
        }

        // Prevent drag/resize if event is pending (waiting for backend confirmation)
        if (isPending) {
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
        <span role="textbox" style={titleStyle}>
          {event.title}
        </span>
        {!event.isAllDay && (
          <>
            {(isDraft || !isInPast) && (
              <Text role="textbox" size="xs" zIndex={ZIndex.LAYER_3}>
                {getTimesLabel(event.startDate, event.endDate)}
              </Text>
            )}
            <>
              <div
                role="button"
                tabIndex={-1}
                style={scalerStyle({ top: "-0.25px" })}
                onMouseDown={(e) => {
                  onScalerMouseDown(event, e, "startDate");
                }}
              />
              <div
                role="button"
                tabIndex={-1}
                style={scalerStyle({ bottom: "-0.25px" })}
                onMouseDown={(e) => {
                  onScalerMouseDown(event, e, "endDate");
                }}
              />
            </>
          </>
        )}
      </Flex>
    </div>
  );
};

export const GridEvent = forwardRef(_GridEvent);
export const GridEventMemo = memo(GridEvent, (prev, next) => {
  return (
    prev.event === next.event &&
    prev.isPlaceholder === next.isPlaceholder &&
    prev.measurements === next.measurements
  );
});
