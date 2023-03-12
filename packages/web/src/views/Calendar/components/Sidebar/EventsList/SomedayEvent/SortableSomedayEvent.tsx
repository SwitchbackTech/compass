import React, { FC } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Schema_Event } from "@core/types/event.types";

import { SomedayEvent } from ".";

interface Props {
  index: number;
  event: Schema_Event;
}

export const SortableSomedayEvent: FC<Props> = ({ index, event }) => {
  return (
    <Draggable draggableId={event._id} index={index} key={event._id}>
      {(provided, snapshot) => {
        return (
          <SomedayEvent
            provided={provided}
            isDragging={snapshot.isDragging}
            event={event}
            isDrafting={false}
            onClose={() => console.log("close")}
            onDraft={() => console.log("draft")}
            onMigrate={() => console.log("migrate")}
            onSubmit={() => console.log("submit")}
            setEvent={() => console.log("setEvent")}
          />
        );
      }}
    </Draggable>
  );
};
