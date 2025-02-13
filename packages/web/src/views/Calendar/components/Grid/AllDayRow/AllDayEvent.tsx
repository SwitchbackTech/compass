import dayjs from "dayjs";
import React, { memo, MouseEvent } from "react";
import { Priorities } from "@core/constants/core.constants";
import { Flex } from "@web/components/Flex";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { isOptimisticEvent } from "@web/common/utils/event.util";
import { getEventPosition } from "@web/common/utils/position/event.position";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Text } from "@web/components/Text";

import { StyledEvent } from "../../Event/styled";

interface Props {
  event: Schema_GridEvent;
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfView"];
  endOfView: WeekProps["component"]["endOfView"];
  onClick: (e: MouseEvent, event: Schema_GridEvent) => void;
  onMouseDown: (e: MouseEvent, event: Schema_GridEvent) => void;
}

const AllDayEvent = ({
  event,
  isPlaceholder,
  measurements,
  startOfView,
  endOfView,
  onClick,
  onMouseDown,
}: Props) => {
  const position = getEventPosition(
    event,
    startOfView,
    endOfView,
    measurements,
    false
  );

  const isOptimistic = isOptimisticEvent(event);

  return (
    <StyledEvent
      id={`${event.title}-${event._id}`}
      allDay={event.isAllDay || true}
      height={position.height}
      isDragging={false}
      isInPast={dayjs().isAfter(dayjs(event.endDate))}
      isPlaceholder={isPlaceholder}
      isOptimistic={isOptimistic}
      isResizing={false}
      left={position.left}
      lineClamp={1}
      onClick={(e: MouseEvent) => onClick(e, event)}
      onMouseDown={(e: MouseEvent) => onMouseDown(e, event)}
      priority={event.priority || Priorities.UNASSIGNED}
      role="button"
      top={position.top}
      width={position.width}
    >
      <Flex
        alignItems={AlignItems.FLEX_START}
        direction={FlexDirections.COLUMN}
      >
        <Text size="m" role="textbox">
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
