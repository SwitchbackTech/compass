import React, { useState } from "react";
import { Popover } from "react-tiny-popover";
import { useDispatch } from "react-redux";
import { useDrag, useDrop } from "react-dnd";
import { Schema_Event } from "@core/types/event.types";
import { editEventSlice } from "@web/ducks/events/slice";

import { Styled } from "./styled";
import { StyledEventForm } from "../../ToggleableEventsListSection/styled";
interface TempEventSchema extends Schema_Event {
  order: number;
}
export interface Props {
  event: TempEventSchema; // replace with Schema_Event or .._Grid
}

export const Event = ({ event: _event }: Props) => {
  const [isEventFormOpen, setEventFormOpen] = useState(false);
  const [event, setEvent] = useState(_event);

  const dispatch = useDispatch();

  const onSubmit = (eventData: Schema_Event) => {
    dispatch(
      editEventSlice.actions.request({ _id: event._id || "", event: eventData })
    );
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "event",
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    item: event,
    options: {
      dropEffect: "move",
    },
  }));

  const onDrop = (draggedEvent: TempEventSchema) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const order =
      (draggedEvent.order || 0) < (event.order || 0)
        ? (event.order || 0) + 1
        : event.order;
    dispatch(
      editEventSlice.actions.request({
        _id: draggedEvent._id || "",
        event: { ...draggedEvent, order },
      })
    );
  };

  const [, drop] = useDrop(
    () => ({
      accept: "event",
      drop: onDrop,
    }),
    [event.order]
  );

  return (
    <Popover
      ref={drag}
      isOpen={isEventFormOpen && !isDragging}
      containerStyle={{ zIndex: "10" }}
      content={
        <StyledEventForm
          event={event}
          setEvent={setEvent}
          onSubmit={onSubmit}
          onClose={() => setEventFormOpen(false)}
        />
      }
    >
      <div ref={drag}>
        <Styled
          ref={drop}
          isDragging={isDragging}
          onClick={() => setEventFormOpen(true)}
          priority={event.priority}
        >
          {event.title}
        </Styled>
      </div>
    </Popover>
  );
};
