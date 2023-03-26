import React, { FC } from "react";
import { Droppable } from "@hello-pangea/dnd";

import { WeekEvents } from "./WeekEvents";
import { WeekColProps } from "./weekColumn.types";
import { NewDraggableSomedayEvent } from "../../EventsList/SomedayEvent/Wrappers/NewDraggableSomedayEvent";

export const WeekEventsColumn: FC<WeekColProps> = ({
  column,
  dateCalcs,
  draft,
  draftId,
  events,
  isDrafting,
  isOverGrid,
  measurements,
  mouseCoords,
  util,
  viewStart,
}) => {
  return (
    <>
      <Droppable droppableId={column.id}>
        {(provided) => {
          return (
            <>
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <WeekEvents
                  dateCalcs={dateCalcs}
                  draftId={draftId}
                  draft={draft}
                  events={events}
                  isDrafting={isDrafting}
                  isOverGrid={isOverGrid}
                  measurements={measurements}
                  mouseCoords={mouseCoords}
                  viewStart={viewStart}
                  util={util}
                />
                {provided.placeholder}
              </div>

              {isDrafting && (
                <NewDraggableSomedayEvent
                  draftId={"somedayDraft"}
                  event={draft}
                  isDrafting={true}
                  isOverGrid={isOverGrid}
                  index={events.length + 1}
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
