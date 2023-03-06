import React, { ForwardedRef, forwardRef, memo, MouseEvent } from "react";
import dayjs from "dayjs";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Text } from "@web/components/Text";
import { Flex } from "@web/components/Flex";
import {
  AlignItems,
  FlexDirections,
  FlexWrap,
} from "@web/components/Flex/styled";
import { getPosition } from "@web/views/Calendar/hooks/event/getPosition";
import { adjustIsTimesShown } from "@web/common/utils/event.util";

import { StyledEvent, StyledEventScaler } from "../../styled";
import { Times } from "./Times";

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
  const event = isDraft
    ? _event
    : adjustIsTimesShown(_event, isInPast, component.isCurrentWeek);

  const position = getPosition(
    event,
    component.startOfView,
    component.endOfView,
    measurements,
    false
  );

  return (
    <StyledEvent
      allDay={event.isAllDay || false}
      className={isDraft ? "active" : null}
      height={position.height || 0}
      isDragging={isDragging}
      isInPast={isInPast}
      isPlaceholder={isPlaceholder}
      isResizing={isResizing}
      left={position.left}
      onMouseDown={(e) => {
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
        <Text size={10.3} role="textbox">
          {event.title}
        </Text>
        {!event.isAllDay && (
          <>
            <Times
              event={event}
              isDrafting={isDragging || isResizing}
              isPlaceholder={isPlaceholder}
            />
            {!isPlaceholder && !isDragging && (
              <>
                <StyledEventScaler
                  isDragging={isDragging}
                  onMouseDown={(e) => onScalerMouseDown(event, e, "startDate")}
                  top="-1px"
                />

                <StyledEventScaler
                  bottom="-1px"
                  isDragging={isDragging}
                  onMouseDown={(e) => onScalerMouseDown(event, e, "endDate")}
                />
              </>
            )}
          </>
        )}
      </Flex>
    </StyledEvent>
  );
};

export const GridEvent = forwardRef(_GridEvent);
export const GridEventMemo = memo(GridEvent);
