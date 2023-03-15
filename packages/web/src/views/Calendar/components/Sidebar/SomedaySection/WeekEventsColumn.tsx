import React, { FC, memo } from "react";
import { Schema_Event } from "@core/types/event.types";
import { Droppable } from "@hello-pangea/dnd";
import { ID_NEW_DRAFT } from "@web/common/constants/web.constants";

import { SomedayEventsProps } from "./hooks/useSomedayEvents";
import { DraggableSomedayEvent } from "../EventsList/SomedayEvent/Wrappers/DraggableSomedayEvent";

interface Props {
  column: {
    id: string;
    title: string;
  };
  draft: Schema_Event;
  events: Schema_Event[];
  isDrafting: boolean;
  util: SomedayEventsProps["util"];
}

const WeekEvents: FC<{
  events: Props["events"];
  draftId: string;
  util: SomedayEventsProps["util"];
}> = memo(({ events, draftId, util }) => {
  return (
    <>
      {events.map((event, index: number) => (
        <DraggableSomedayEvent
          event={event}
          draftId={draftId}
          index={index}
          key={event._id}
          util={util}
        />
      ))}
    </>
  );
});

export const WeekEventsColumn: FC<Props> = ({
  column,
  draft,
  events,
  isDrafting,
  util,
}) => {
  return (
    <>
      <Droppable droppableId={column.id}>
        {(provided) => {
          return (
            <>
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <WeekEvents events={events} draftId={draft?._id} util={util} />
                {provided.placeholder}
              </div>

              {isDrafting && draft && (
                <DraggableSomedayEvent
                  draftId={ID_NEW_DRAFT}
                  event={draft}
                  index={5}
                  key={ID_NEW_DRAFT}
                  util={util}
                />
              )}
            </>
          );
        }}
      </Droppable>
    </>
  );
};
