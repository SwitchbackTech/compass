import React, { FC } from "react";
import { useDrop } from "react-dnd";
import { DragItem } from "@web/common/types/dnd.types";
import { ColorNames } from "@web/common/types/styles";
import { getColor } from "@web/common/utils/colors";
import { EditingWeekEvent } from "@web/views/Calendar/components/EditingWeekEvent";
import { WeekEvent } from "@web/views/Calendar/components/WeekEvent";
import { StyledEvents } from "@web/views/Calendar/styled";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";

interface Props {
  weekViewProps: WeekViewProps;
}

export const AllDayRow: FC<Props> = ({ weekViewProps }) => {
  const { component, eventHandlers } = weekViewProps;

  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      accept: DragItem.EVENT_SOMEDAY,
      drop: () => console.log("dropped onto a AllDayRow"),
      // hover: (monitor) => console.log("hovering [AllDay]"),
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
          setEvent={(event) => eventHandlers.setEditingEvent(event)}
          weekViewProps={weekViewProps}
        />
      )}
    </StyledEvents>
  );
};
