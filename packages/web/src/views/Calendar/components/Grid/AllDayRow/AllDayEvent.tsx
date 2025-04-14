import dayjs from "dayjs";
import React, { MouseEvent, memo } from "react";
import { Priorities } from "@core/constants/core.constants";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { isOptimisticEvent } from "@web/common/utils/event.util";
import { getEventPosition } from "@web/common/utils/position.util";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { StyledEvent } from "../../Event/styled";

interface Props {
  event: Schema_GridEvent;
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfView"];
  endOfView: WeekProps["component"]["endOfView"];
  onMouseDown: (e: MouseEvent, event: Schema_GridEvent) => void;
}

const AllDayEvent = ({
  event,
  isPlaceholder,
  measurements,
  startOfView,
  endOfView,
  onMouseDown,
}: Props) => {
  const position = getEventPosition(
    event,
    startOfView,
    endOfView,
    measurements,
    false,
  );

  const isOptimistic = isOptimisticEvent(event);
  const isRecurring = event.recurrence && event.recurrence?.eventId !== null;

  const styledEventProps = {
    [DATA_EVENT_ELEMENT_ID]: event._id,
    allDay: event.isAllDay || true,
    height: position.height,
    isDragging: false,
    isInPast: dayjs().isAfter(dayjs(event.endDate)),
    isPlaceholder,
    isOptimistic,
    isResizing: false,
    left: position.left,
    lineClamp: 1,
    onMouseDown: (e: MouseEvent) => {
      if (isRecurring) {
        console.log(event);
        alert("Can't edit recurring events (yet)");
        e.stopPropagation();
        return;
      }
      onMouseDown(e, event);
    },
    priority: event.priority || Priorities.UNASSIGNED,
    role: isRecurring ? undefined : "button",
    top: position.top,
    width: position.width,
  };

  return (
    <StyledEvent {...styledEventProps}>
      <Flex
        alignItems={AlignItems.FLEX_START}
        direction={FlexDirections.COLUMN}
      >
        <Text size="m" role={isRecurring ? undefined : "textbox"}>
          {event.title}
          {isRecurring && "*"}
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
