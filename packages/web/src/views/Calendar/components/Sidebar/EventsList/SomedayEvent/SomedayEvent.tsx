import React, { useRef, useState } from "react";
import { usePopper } from "react-popper";
import { useDispatch } from "react-redux";
import { useDrag } from "react-dnd";
import { Schema_Event } from "@core/types/event.types";
import { DragItem, ZIndex } from "@web/common/constants/web.constants";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";
import { editEventSlice } from "@web/ducks/events/slice";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";

import { Styled } from "./styled";

export interface Props {
  event: Schema_Event;
}

export const SomedayEvent = ({ event: _event }: Props) => {
  const dispatch = useDispatch();
  const formRef = useRef<HTMLDivElement>(null);

  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [event, setEvent] = useState(_event);

  const [popperRef, setPopperRef] = useState<HTMLElement>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement>(null);

  useOnClickOutside(formRef, () => setIsEventFormOpen(false));

  const { styles, attributes } = usePopper(popperRef, popperElement, {
    placement: "right",
    strategy: "fixed",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [0, 20],
        },
      },
    ],
  });
  const popperStyles = { ...styles.popper, zIndex: ZIndex.LAYER_2 };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: DragItem.EVENT_SOMEDAY,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    item: event,
    options: {
      dropEffect: "move",
    },
  }));

  // const order = //$$ move to wherever drop logic is
  //   (draggedEvent.order || 0) < (event.order || 0)
  //     ? (event.order || 0) + 1
  //     : event.order;

  const onSubmit = () => {
    dispatch(editEventSlice.actions.request({ _id: event._id, event }));
    setIsEventFormOpen(false);
  };

  return (
    <>
      <div ref={setPopperRef}>
        <div ref={drag}>
          <div>
            <Styled
              isDragging={isDragging}
              onClick={() => setIsEventFormOpen(true)}
              priority={event.priority}
            >
              {event.title}
            </Styled>
          </div>
        </div>
      </div>
      <div ref={setPopperElement} style={popperStyles} {...attributes.popper}>
        {isEventFormOpen && (
          <div ref={formRef}>
            <SomedayEventForm
              event={event}
              isOpen={isEventFormOpen}
              onSubmit={onSubmit}
              onClose={() => setIsEventFormOpen(false)}
              setEvent={setEvent}
            />
          </div>
        )}
      </div>
    </>
  );
};
