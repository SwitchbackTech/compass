import React, { FC } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";

import { DraggableSomedayEvent } from "../../EventsList/SomedayEvent/Wrappers/DraggableSomedayEvent";
import { WeekColProps } from "./weekColumn.types";
import { WeekEvents } from "./WeekEvents";

export const WeekEventsColumn: FC<WeekColProps> = ({
  column,
  draft,
  draftId,
  events,
  isDraftingExisting,
  isDraftingNew,
  isOverGrid,
  util,
}) => {
  return (
    <>
      <Droppable droppableId={column.id}>
        {(provided) => {
          return (
            <>
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <WeekEvents
                  draftId={draftId}
                  events={events}
                  isDrafting={isDraftingExisting}
                  isOverGrid={isOverGrid}
                  util={util}
                />
                {provided.placeholder}
              </div>

              {isDraftingNew && (
                <DraggableSomedayEvent
                  draftId={ID_SOMEDAY_DRAFT}
                  event={draft}
                  index={events.length}
                  isDrafting={true}
                  isOverGrid={isOverGrid}
                  key={ID_SOMEDAY_DRAFT}
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
