import React, { FC } from "react";
import { useDrop } from "react-dnd";
import { DragItem, DropResult } from "@web/common/types/dnd.types";
import { ColorNames } from "@web/common/types/styles";
import { getColor } from "@web/common/utils/colors";
import { EditingWeekEvent } from "@web/views/Calendar/components/EditingWeekEvent";
import { WeekEvent } from "@web/views/Calendar/components/WeekEvent";
import { StyledEvents } from "@web/views/Calendar/styled";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { SIDEBAR_WIDTH } from "@web/views/Calendar/calendar.constants";
import { useDispatch } from "react-redux";
import { YEAR_MONTH_DAY_FORMAT } from "@web/common/constants/dates";
import { Schema_Event } from "@core/types/event.types";
import { getFutureEventsSlice } from "@web/ducks/events/slice";

interface Props {
  weekViewProps: WeekViewProps;
}

export const AllDayRow: FC<Props> = ({ weekViewProps }) => {
  const { component, core, eventHandlers } = weekViewProps;
  const dispatch = useDispatch();

  const convertSomedayToAllDay = (_id: string, x: number, y: number) => {
    const adjustedX = x - SIDEBAR_WIDTH; // deduct sidebar because it had to be open if event was dropped
    const _start = core.getDateByXY(adjustedX, y);
    const start = _start.format(YEAR_MONTH_DAY_FORMAT);
    const end = _start.add(1, "day").format(YEAR_MONTH_DAY_FORMAT);

    const updatedFields: Schema_Event = {
      isAllDay: true,
      isSomeday: false,
      isTimesShown: false,
      startDate: start,
      endDate: end,
    };
    dispatch(
      getFutureEventsSlice.actions.convert({
        _id,
        updatedFields,
      })
    );
  };

  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      accept: DragItem.EVENT_SOMEDAY,
      drop: (item: DropResult, monitor) => {
        const { x, y } = monitor.getClientOffset();
        convertSomedayToAllDay(item._id, x, y);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    []
  );

  const border = `1px solid ${getColor(ColorNames.WHITE_2)}`;

  return (
    <StyledEvents
      ref={drop}
      style={{ borderTop: isOver && canDrop ? border : "" }}
    >
      {component.allDayEvents.map((event: Schema_GridEvent) => (
        <WeekEvent
          event={event}
          key={event._id}
          weekViewProps={weekViewProps}
        />
      ))}

      {component.editingEvent && component.editingEvent.isAllDay && (
        <EditingWeekEvent
          event={component.editingEvent}
          isOpen={!!component.editingEvent.isOpen}
          onCloseEventForm={() => eventHandlers.setEditingEvent(null)}
          onSubmitEventForm={eventHandlers.onSubmitEvent}
          weekViewProps={weekViewProps}
        />
      )}
    </StyledEvents>
  );
};
