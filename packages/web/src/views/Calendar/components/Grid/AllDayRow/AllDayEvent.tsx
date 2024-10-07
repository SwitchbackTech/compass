import dayjs from "dayjs";
import React, { memo, MouseEvent } from "react";
import { Schema_Event } from "@core/types/event.types";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { getPosition } from "@web/views/Calendar/hooks/event/getPosition";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Text } from "@web/components/Text";

import { StyledEvent } from "../../Event/styled";

interface Props {
  event: Schema_Event;
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfView"];
  endOfView: WeekProps["component"]["endOfView"];
  onMouseDown: (e: MouseEvent, event: Schema_Event) => void;
}

const AllDayEvent = ({
  event,
  isPlaceholder,
  measurements,
  startOfView,
  endOfView,
  onMouseDown,
}: Props) => {
  const position = getPosition(
    event,
    startOfView,
    endOfView,
    measurements,
    false
  );

  return (
    <StyledEvent
      allDay={event.isAllDay}
      height={position.height}
      isDragging={false}
      isInPast={dayjs().isAfter(dayjs(event.endDate))}
      isPlaceholder={isPlaceholder}
      isResizing={false}
      left={position.left}
      lineClamp={1}
      onMouseDown={(e) => onMouseDown(e, event)}
      priority={event.priority}
      role="button"
      top={position.top}
      width={position.width}
    >
      <Flex
        alignItems={AlignItems.FLEX_START}
        direction={FlexDirections.COLUMN}
      >
        <Text size={10.3} role="textbox">
          {event.title}
          <SpaceCharacter />
        </Text>
      </Flex>
    </StyledEvent>
  );
};

export const AllDayEventMemo = memo(AllDayEvent, (prev, next) => {
  return (
    prev.event === next.event &&
    prev.isPlaceholder === next.isPlaceholder &&
    prev.measurements === next.measurements
  );
});
