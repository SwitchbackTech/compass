import {
  type ForwardedRef,
  type KeyboardEvent,
  type MouseEvent,
  forwardRef,
  memo,
  useMemo,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import {
  DATA_EVENT_ELEMENT_ID,
  ZIndex,
} from "@web/common/constants/web.constants";
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
import { RepeatIcon } from "@web/components/Icons/Repeat";
import { Text } from "@web/components/Text";
import { selectIsEventPending } from "@web/ducks/events/selectors/pending.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import {
  StyledEvent,
  StyledEventScaler,
  StyledEventTitle,
} from "@web/views/Calendar/components/Event/styled";
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
  const rule = event.recurrence?.rule;
  const recurrenceEventId = event.recurrence?.eventId;
  const isRecurring =
    Array.isArray(rule) || typeof recurrenceEventId === "string";

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

  const styledEventProps = {
    [DATA_EVENT_ELEMENT_ID]: event._id,
    allDay: event.isAllDay || false,
    className: isDraft ? "active" : undefined,
    height: position.height || 0,
    isRecurring,
    isDragging,
    isInPast,
    isPlaceholder,
    isPending,
    isResizing,
    left: position.left,
    lineClamp,
    onMouseDown: (e: MouseEvent) => {
      if (isRightClick(e)) {
        // Ignores right click here so it can pass through to context menu
        return;
      }

      // Prevent drag/resize if event is pending (waiting for backend confirmation)
      if (isPending) {
        return;
      }

      onEventMouseDown(event, e);
    },
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter" && e.key !== " ") {
        return;
      }

      e.preventDefault();
      onEventKeyDown?.(event);
    },

    priority: event.priority || Priorities.UNASSIGNED,
    ref,
    role: "button",
    tabIndex: 0,
    top: position.top,
    width: position.width || 0,
  };

  return (
    <StyledEvent {...styledEventProps}>
      <Flex
        alignItems={AlignItems.FLEX_START}
        direction={FlexDirections.COLUMN}
        flexWrap={FlexWrap.WRAP}
      >
        <div className="flex max-w-full items-start gap-1 overflow-hidden">
          {isRecurring && (
            <RepeatIcon
              aria-label="Recurring event"
              size={12}
              className="mt-[1px] shrink-0"
            />
          )}
          <StyledEventTitle eventHeight={position.height} role="textbox">
            {event.title}
          </StyledEventTitle>
        </div>
        {!event.isAllDay && (
          <>
            {(isDraft || !isInPast) && (
              <Text role="textbox" size="xs" zIndex={ZIndex.LAYER_3}>
                {getTimesLabel(event.startDate, event.endDate)}
              </Text>
            )}
            <>
              <StyledEventScaler
                showResizeCursor={
                  !isPlaceholder && !isResizing && !isDragging && !isPending
                }
                onMouseDown={(e) => {
                  onScalerMouseDown(event, e, "startDate");
                }}
                top="-0.25px"
                zIndex={ZIndex.LAYER_4}
              />

              <StyledEventScaler
                bottom="-0.25px"
                showResizeCursor={
                  !isPlaceholder && !isResizing && !isDragging && !isPending
                }
                onMouseDown={(e) => {
                  onScalerMouseDown(event, e, "endDate");
                }}
                zIndex={ZIndex.LAYER_4}
              />
            </>
          </>
        )}
      </Flex>
    </StyledEvent>
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
