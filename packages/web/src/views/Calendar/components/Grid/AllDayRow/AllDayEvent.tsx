import { MouseEvent, memo } from "react";
import { Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import {
  DATA_EVENT_ELEMENT_ID,
  ZIndex,
} from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getEventPosition } from "@web/common/utils/position/position.util";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { selectIsEventPending } from "@web/ducks/events/selectors/pending.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { StyledEvent, StyledEventHorizontalScaler } from "../../Event/styled";

interface Props {
  event: Schema_GridEvent;
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfView"];
  endOfView: WeekProps["component"]["endOfView"];
  onMouseDown: (e: MouseEvent, event: Schema_GridEvent) => void;
  onScalerMouseDown?: (
    event: Schema_GridEvent,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
}

const AllDayEvent = ({
  event,
  isPlaceholder,
  measurements,
  startOfView,
  endOfView,
  onMouseDown,
  onScalerMouseDown,
}: Props) => {
  const position = getEventPosition(
    event,
    startOfView,
    endOfView,
    measurements,
    false,
  );

  const isPending = useAppSelector((state) =>
    selectIsEventPending(state, event._id!),
  );
  const isRecurring = event.recurrence && event.recurrence?.eventId !== null;

  const styledEventProps = {
    [DATA_EVENT_ELEMENT_ID]: event._id,
    allDay: event.isAllDay || true,
    height: position.height,
    isDragging: false,
    isInPast: dayjs().isAfter(dayjs(event.endDate)),
    isPlaceholder,
    isPending,
    isRecurring,
    isResizing: false,
    left: position.left,
    lineClamp: 1,
    onMouseDown: (e: MouseEvent) => {
      // Prevent drag/resize if event is pending (waiting for backend confirmation)
      if (isPending) {
        return;
      }
      onMouseDown(e, event);
    },
    priority: event.priority || Priorities.UNASSIGNED,
    role: "button",
    top: position.top,
    width: position.width,
  };

  return (
    <StyledEvent {...styledEventProps}>
      <Flex
        alignItems={AlignItems.FLEX_START}
        direction={FlexDirections.COLUMN}
      >
        <Text size="m" role="textbox">
          {event.title}
          <SpaceCharacter />
        </Text>
      </Flex>
      {onScalerMouseDown && (
        <>
          <StyledEventHorizontalScaler
            showResizeCursor={!isPlaceholder && !isPending}
            onMouseDown={(e) => {
              e.stopPropagation();
              onScalerMouseDown(event, e, "startDate");
            }}
            // -0.25px is a small offset for displaying the scaler, since we want the scaler to be slightly offset from the event
            left="-0.25px"
            zIndex={ZIndex.LAYER_4}
          />

          <StyledEventHorizontalScaler
            right="-0.25px"
            showResizeCursor={!isPlaceholder && !isPending}
            onMouseDown={(e) => {
              e.stopPropagation();
              onScalerMouseDown(event, e, "endDate");
            }}
            zIndex={ZIndex.LAYER_4}
          />
        </>
      )}
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
