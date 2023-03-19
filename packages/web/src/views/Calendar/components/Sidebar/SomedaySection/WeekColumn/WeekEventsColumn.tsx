import React, { FC } from "react";
import { Droppable } from "@hello-pangea/dnd";

import { WeekEvents } from "./WeekEvents";
import { WeekColProps } from "./weekColumn.types";

export const WeekEventsColumn: FC<WeekColProps> = ({
  column,
  dateCalcs,
  draft,
  events,
  getDraft,
  isOverGrid,
  measurements,
  mouseCoords,
  util,
  viewStart,
}) => {
  return (
    <>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => {
          return (
            <>
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <WeekEvents
                  dateCalcs={dateCalcs}
                  draftId={draft?._id}
                  draft={getDraft(snapshot.draggingOverWith)}
                  events={events}
                  isOverGrid={isOverGrid}
                  measurements={measurements}
                  mouseCoords={mouseCoords}
                  viewStart={viewStart}
                  util={util}
                />
                {provided.placeholder}
              </div>

              {/* {isDrafting && draft && (
                <DraggableSomedayEvent
                  draftId={ID_NEW_DRAFT}
                  event={draft}
                  index={5}
                  key={ID_NEW_DRAFT}
                  util={util}
                />
              )} */}
            </>
          );
        }}
      </Droppable>
    </>
  );
};
