import React, { ForwardedRef, forwardRef, memo, MouseEvent } from "react";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Text } from "@web/components/Text";
import { getTimeLabel } from "@web/common/utils/date.utils";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { getPosition } from "@web/views/Calendar/hooks/event/getPosition";

import { StyledEvent, StyledEventScaler } from "../../styled";

interface Props {
  event: Schema_GridEvent;
  isDraft: boolean;
  isDragging: boolean;
  isPlaceholder: boolean;
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
    event,
    isDraft,
    isDragging,
    isPlaceholder,
    measurements,
    onEventMouseDown,
    onScalerMouseDown,
    weekProps,
  }: Props,
  ref: ForwardedRef<HTMLButtonElement>
) => {
  const { component } = weekProps;
  const position = getPosition(
    event,
    component.startOfSelectedWeekDay,
    component.endOfSelectedWeekDay,
    measurements,
    false
  );

  return (
    <StyledEvent
      allDay={event.isAllDay || false}
      className={isDraft ? "active" : ""}
      // duration={+durationHours || 1} //++
      height={position.height}
      isDragging={isDragging}
      isPlaceholder={isPlaceholder}
      left={position.left}
      // lineClamp={event.isAllDay ? 1 : getLineClamp(durationHours)}
      // lineClamp={1}
      onMouseDown={(e) => {
        onEventMouseDown(event, e);
      }}
      priority={event.priority}
      ref={ref}
      role="button"
      tabindex="0"
      top={position.top}
      width={position.width}
    >
      <Flex
        alignItems={AlignItems.FLEX_START}
        direction={FlexDirections.COLUMN}
      >
        {!event.isAllDay && (
          <>
            <Text
              lineHeight={10}
              role="textbox"
              size={10}
              title="Click to hide times"
            >
              {getTimeLabel(event.startDate, event.endDate)}
            </Text>
            <StyledEventScaler
              top="-1px"
              onMouseDown={(e) => onScalerMouseDown(event, e, "startDate")}
            />

            <StyledEventScaler
              bottom="-1px"
              onMouseDown={(e) => onScalerMouseDown(event, e, "endDate")}
            />
          </>
        )}

        <Text size={12} role="textbox">
          {event.title}
          <SpaceCharacter />
        </Text>
      </Flex>
    </StyledEvent>
  );
};

export const GridEvent = forwardRef(_GridEvent);
export const GridEventMemo = memo(GridEvent);
