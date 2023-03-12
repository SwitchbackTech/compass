import React, { FC, memo } from "react";
import { Schema_Event } from "@core/types/event.types";
import { Droppable } from "@hello-pangea/dnd";

import { SortableSomedayEvent } from "../EventsList/SomedayEvent/SortableSomedayEvent";

interface Props {
  column: {
    id: string;
    title: string;
  };
  events: Schema_Event[];
}

const WeekEvents: FC<{ events: Props["events"] }> = memo(({ events }) => {
  return (
    <>
      {events.map((event, index: number) => (
        <SortableSomedayEvent event={event} index={index} key={event._id} />
      ))}
    </>
  );
});

export const WeekEventsColumn: FC<Props> = ({ column, events }) => {
  return (
    <Droppable droppableId={column.id}>
      {(provided) => {
        return (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <WeekEvents events={events} />
            {provided.placeholder}
          </div>
        );
      }}
    </Droppable>
  );
};
