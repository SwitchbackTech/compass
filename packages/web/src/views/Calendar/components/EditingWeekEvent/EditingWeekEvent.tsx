import React, { SetStateAction } from "react";
import { ArrowContainer, Popover } from "react-tiny-popover";

import { getColor } from "@web/common/helpers/colors";
import { colorNameByPriority } from "@web/common/styles/colors";
import { EventEntity, Priorities } from "@web/common/types/entities";
import { EventForm } from "@web/views/EventForm";

import { WeekEvent } from "../WeekEvent";
import { GridEventEntity } from "../../weekViewHooks/types";
import { WeekViewProps } from "../../weekViewHooks/useGetWeekViewProps";

export interface Props {
  isOpen: boolean;
  onSubmitEventForm: (event: EventEntity) => void;
  event?: GridEventEntity;
  onCloseEventForm: () => void;
  weekViewProps: WeekViewProps;
  setEvent: React.Dispatch<SetStateAction<EventEntity>>;
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
            onSubmit={onSubmitEventForm}
            onClose={onCloseEventForm}
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
