import dayjs from "dayjs";
import React, {
  ForwardedRef,
  MouseEvent,
  forwardRef,
  memo,
  useMemo,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import {
  DATA_EVENT_ELEMENT_ID,
  ZIndex,
} from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { isOptimisticEvent } from "@web/common/utils/event.util";
import { getLineClamp } from "@web/common/utils/grid.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { getEventPosition } from "@web/common/utils/position.util";
import { getTimesLabel } from "@web/common/utils/web.date.util";
import { Flex } from "@web/components/Flex";
import {
  AlignItems,
  FlexDirections,
  FlexWrap,
} from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { StyledEvent, StyledEventScaler, StyledEventTitle } from "../../styled";

interface Props {
  event: Schema_GridEvent;
  isDraft: boolean;
  isDragging: boolean;
  isPlaceholder: boolean;
  isResizing: boolean;
  measurements: Measurements_Grid;
  onEventMouseDown: (event: Schema_GridEvent, e: MouseEvent) => void;
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
    onScalerMouseDown,
    weekProps,
  }: Props,
  ref: ForwardedRef<HTMLDivElement>,
) => {
  const { component } = weekProps;

  const isInPast = dayjs().isAfter(dayjs(_event.endDate));
  const event = _event;
  const isOptimistic = isOptimisticEvent(event);
  const isRecurring = event.recurrence && event.recurrence?.eventId !== null;

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
    isDragging,
    isInPast,
    isPlaceholder,
    isOptimistic,
    isResizing,
    left: position.left,
    lineClamp,
    onMouseDown: (e: MouseEvent) => {
      // if (isRecurring) {
      //   console.log(event);
      //   alert("Can't edit recurring events (yet)");
      //   e.stopPropagation();
      //   return;
      // }
      if (
        isOptimistic || // Event is in the process of being created, don't allow any interactions until it's completely saved
        isRightClick(e) // Ignores right click here so it can pass through to context menu
      )
        return;

      onEventMouseDown(event, e);
    },

    priority: event.priority || Priorities.UNASSIGNED,
    ref,
    role: "button",
    tabindex: "0",
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
        <StyledEventTitle size="m" role="textbox">
          {event.title}
          {isRecurring && "*"}
        </StyledEventTitle>
        {!event.isAllDay && (
          <>
            {(isDraft || !isInPast) && (
              <Text role="textbox" size="xs" zIndex={ZIndex.LAYER_3}>
                {getTimesLabel(
                  event.startDate as string,
                  event.endDate as string,
                )}
              </Text>
            )}
            <>
              <StyledEventScaler
                showResizeCursor={!isPlaceholder && !isResizing && !isDragging}
                onMouseDown={(e) => {
                  if (isRecurring) {
                    alert("Can't edit recurring events (yet)");
                    e.stopPropagation();
                    return;
                  }
                  onScalerMouseDown(event, e, "startDate");
                }}
                top="-0.25px"
                zIndex={ZIndex.LAYER_4}
              />

              <StyledEventScaler
                bottom="-0.25px"
                showResizeCursor={!isPlaceholder && !isResizing && !isDragging}
                onMouseDown={(e) => {
                  if (isRecurring) {
                    alert("Can't edit recurring events (yet)");
                    e.stopPropagation();
                    return;
                  }
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
