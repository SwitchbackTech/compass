import React, { useRef, useState } from "react";
import { usePopper } from "react-popper";
import { useDispatch } from "react-redux";
import { Schema_Event } from "@core/types/event.types";
import { ZIndex } from "@web/common/constants/web.constants";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";
import { Text } from "@web/components/Text";
import { editEventSlice } from "@web/ducks/events/event.slice";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";

import { StyledEventOrPlaceholder } from "./styled";

export interface Props {
  event: Schema_Event;
  isDragging: boolean;
}

export const SomedayEvent = ({ event: _event, isDragging }: Props) => {
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
  const popperStyles = { ...styles.popper, zIndex: ZIndex.LAYER_3 };

  const onSubmit = () => {
    dispatch(editEventSlice.actions.request({ _id: event._id, event }));
    setIsEventFormOpen(false);
  };

  return (
    <>
      <div ref={setPopperRef}>
        <StyledEventOrPlaceholder
          isDragging={isDragging}
          onClick={() => setIsEventFormOpen(true)}
          priority={event.priority}
          role="button"
        >
          <Text size={15}>{event.title}</Text>
        </StyledEventOrPlaceholder>
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
