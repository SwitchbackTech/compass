import React, { useState, SetStateAction } from "react";
import { usePopper } from "react-popper";
import { Priorities } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { getColor } from "@web/common/utils/colors";
import { colorNameByPriority } from "@web/common/styles/colors";
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
  const [referenceElement, setReferenceElement] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const [arrowElement, setArrowElement] = useState(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "right",
    // strategy: "fixed", // prevents scrolling (is scroll is also false), but has other issues
    modifiers: [
      // { name: "eventListeners", options: { scroll: false, resize: false } },
      // { name: "eventListeners", enabled: false },
      // { name: "arrow", options: { element: arrowElement } },
      {
        name: "preventOverflow",
        options: {
          // rootBoundary: "document",
          tether: false,
        },
      },
      // },
      // {
      //   name: "offset",
      //   options: {
      //     offset: [0, 20],
      //   },
      // },
    ],
  });

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

      <div ref={setPopperElement} style={styles.popper} {...attributes.popper}>
        {isOpen && (
          <EventForm
            setEvent={setEvent}
            event={event}
            onDelete={weekViewProps.eventHandlers.onDeleteEvent}
            onClose={onCloseEventForm}
            onSubmit={onSubmitEventForm}
          />
        )}
        <div ref={setArrowElement} style={styles.arrow} />
      </div>
    </>
  );
};
