import React, { FC } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Schema_Event } from "@core/types/event.types";

import { SomedayEvent } from "..";
import { SomedayEventsProps } from "../../../SomedaySection/hooks/useSomedayEvents";

interface Props {
  index: number;
  draftId: string;
  event: Schema_Event;
  util: SomedayEventsProps["util"];
}

export const SortableSomedayEvent: FC<Props> = ({
  index,
  draftId,
  event,
  util,
}) => {
  return (
    <Draggable draggableId={event._id} index={index} key={event._id}>
      {(provided, snapshot) => {
        return (
          <SomedayEvent
            // {...provided.dragHandleProps}
            // {...provided.dragHandleProps}
            isDragging={snapshot.isDragging}
            event={event}
            isDrafting={draftId === event._id}
            onClose={util.close}
            onDraft={util.onDraft}
            onMigrate={util.onMigrate}
            onSubmit={util.onSubmit}
            provided={provided}
            // ref={provided.innerRef}
            setEvent={util.setDraft}
          />
        );
      }}
    </Draggable>
  );
};
