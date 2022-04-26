import React, { useState } from "react";
import { usePopper } from "react-popper";
import { EventForm } from "@web/views/EventForm";
import { FormProps } from "@web/views/EventForm/types";

import { WeekEvent } from "../WeekEvent";
import { WeekViewProps } from "../../weekViewHooks/useGetWeekViewProps";

interface WeekFormProps extends FormProps {
  weekViewProps: WeekViewProps;
}

export const EditingWeekEvent: React.FC<WeekFormProps> = ({
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
            onDelete={() => {
              weekViewProps.eventHandlers.onDeleteEvent(event._id);
              weekViewProps.eventHandlers.setEditingEvent(null);
            }}
            onClose={onCloseEventForm}
            onSubmit={onSubmitEventForm}
          />
        )}
      </div>
    </>
  );
};
