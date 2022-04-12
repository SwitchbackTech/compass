import React, { useState, SetStateAction } from "react";
import { usePopper } from "react-popper";
import { Schema_Event } from "@core/types/event.types";
import { EventForm } from "@web/views/EventForm";

import { WeekEvent } from "../WeekEvent";
import { Schema_GridEvent } from "../../weekViewHooks/types";
import { WeekViewProps } from "../../weekViewHooks/useGetWeekViewProps";

export interface Props {
  isOpen: boolean;
  onSubmitEventForm: (event: Schema_Event) => void;
  event: Schema_GridEvent;
  onCloseEventForm: () => void;
  weekViewProps: WeekViewProps;
  setEvent: React.Dispatch<SetStateAction<Schema_Event>>;
}

export const EditingWeekEvent: React.FC<Props> = ({
  isOpen,
  onSubmitEventForm,
  event,
  setEvent,
  onCloseEventForm,
  weekViewProps,
}) => {
  const [referenceElement, setReferenceElement] = useState<HTMLElement>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement>(null);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "auto-start",
    // modifiers: [
    //   {
    //     name: "preventOverflow",
    //   },
    // ],
  });
  const popperStyles = { ...styles.popper, zIndex: 2 };

  return (
    <>
      <div>
        <WeekEvent
          event={{
            ...event,
            isEditing: true,
          }}
          weekViewProps={weekViewProps}
          ref={setReferenceElement}
        />
      </div>

      <div ref={setPopperElement} style={popperStyles} {...attributes.popper}>
        {isOpen && (
          <EventForm
            setEvent={setEvent}
            event={event}
            onDelete={weekViewProps.eventHandlers.onDeleteEvent}
            onClose={onCloseEventForm}
            onSubmit={onSubmitEventForm}
          />
        )}
      </div>
    </>
  );
};
