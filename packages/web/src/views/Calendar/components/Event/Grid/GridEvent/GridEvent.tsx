import React, {
  ForwardedRef,
  forwardRef,
  memo,
  MouseEvent,
  useMemo,
} from "react";
import dayjs from "dayjs";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Flex } from "@web/components/Flex";
import {
  AlignItems,
  FlexDirections,
  FlexWrap,
} from "@web/components/Flex/styled";
import { getPosition } from "@web/views/Calendar/hooks/event/getPosition";
import { getLineClamp } from "@web/common/utils/grid.util";
import { getTimesLabel } from "@web/common/utils/web.date.util";
import {
  ID_OPTIMISTIC_PREFIX,
  ZIndex,
} from "@web/common/constants/web.constants";
import { Text } from "@web/components/Text";

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
    dateToChange: "startDate" | "endDate"
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
  ref: ForwardedRef<HTMLButtonElement>
) => {
  const { component } = weekProps;

  const isInPast = dayjs().isAfter(dayjs(_event.endDate));
  const isOptimistic = _event._id?.startsWith(ID_OPTIMISTIC_PREFIX);
  const event = _event;

  const position = getPosition(
    event,
    component.startOfView,
    component.endOfView,
    measurements,
    false
  );

  const lineClamp = useMemo(
    () => getLineClamp(position.height),
    [position.height]
  );

  return (
    <StyledEvent
      allDay={event.isAllDay || false}
      className={isDraft ? "active" : null}
      height={position.height || 0}
      isDragging={isDragging}
      isInPast={isInPast}
      isPlaceholder={isPlaceholder}
      isOptimistic={isOptimistic}
      isResizing={isResizing}
      left={position.left}
      lineClamp={lineClamp}
      onMouseDown={(e) => {
        if (isOptimistic) return;

        onEventMouseDown(event, e);
      }}
      priority={event.priority}
      ref={ref}
      role="button"
      tabindex="0"
      top={position.top}
      width={position.width || 0}
    >
      <Flex
        alignItems={AlignItems.FLEX_START}
        direction={FlexDirections.COLUMN}
        flexWrap={FlexWrap.WRAP}
      >
        <StyledEventTitle size="m" role="textbox">
          {event.title}
        </StyledEventTitle>
        {!event.isAllDay && (
          <>
            {(isDraft || !isInPast) && (
              <Text role="textbox" size="xs" zIndex={ZIndex.LAYER_3}>
                {getTimesLabel(event.startDate, event.endDate)}
              </Text>
            )}
            <>
              <StyledEventScaler
                showResizeCursor={!isPlaceholder && !isResizing && !isDragging}
                onMouseDown={(e) => onScalerMouseDown(event, e, "startDate")}
                top="-0.25px"
              />

              <StyledEventScaler
                bottom="-0.25px"
                showResizeCursor={!isPlaceholder && !isResizing && !isDragging}
                onMouseDown={(e) => onScalerMouseDown(event, e, "endDate")}
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
