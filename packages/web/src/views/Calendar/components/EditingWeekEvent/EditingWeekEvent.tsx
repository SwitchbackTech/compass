import React, { SetStateAction } from "react";
import { ArrowContainer, Popover } from "react-tiny-popover";
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
}) => (
  <Popover
    containerStyle={{ zIndex: "2" }}
    isOpen={isOpen}
    positions={["right", "left", "bottom", "top"]}
    content={(props) => (
      <ArrowContainer
        {...props}
        arrowSize={10}
        arrowColor={getColor(
          colorNameByPriority[event?.priority || Priorities.WORK]
        )}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <EventForm
            setEvent={setEvent}
            event={event}
            onDelete={weekViewProps.eventHandlers.onDeleteEvent}
            onClose={onCloseEventForm}
            onSubmit={onSubmitEventForm}
          />
        </div>
      </ArrowContainer>
    )}
  >
    <WeekEvent
      weekViewProps={weekViewProps}
      event={{
        ...event,
        priority: event?.priority || Priorities.WORK,
        isEditing: true,
      }}
    />
  </Popover>
);
