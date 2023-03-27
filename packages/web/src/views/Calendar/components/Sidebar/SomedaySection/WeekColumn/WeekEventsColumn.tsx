import React, { FC } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";

import { WeekEvents } from "./WeekEvents";
import { WeekColProps } from "./weekColumn.types";
import { DraggableSomedayEvent } from "../../EventsList/SomedayEvent/Wrappers/DraggableSomedayEvent";

export const WeekEventsColumn: FC<WeekColProps> = ({
  column,
  dateCalcs,
  draft,
  draftId,
  events,
  isDraftingExisting,
  isDraftingNew,
  isOverGrid,
  measurements,
  mouseCoords,
  util,
  viewStart,
}) => {
  const _isDrafting = isDraftingExisting || isDraftingNew;
  const shouldPreview = _isDrafting && isOverGrid && !draft.isOpen;
  // isDraftingNew && console.log("drafting new...", draft, draftId);

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
                  isDrafting={isDraftingExisting}
                  isDraftingNew={isDraftingNew}
                  isOverGrid={isOverGrid}
                  measurements={measurements}
                  mouseCoords={mouseCoords}
                  shouldPreview={shouldPreview}
                  viewStart={viewStart}
                  util={util}
                />
                {provided.placeholder}
              </div>

              {/* {isDraftingNew && (
                <DraggableSomedayEvent
                  draftId={ID_SOMEDAY_DRAFT}
                  event={draft}
                  // index={events.length + 1}
                  index={events.length}
                  isDrafting={true}
                  isOverGrid={isOverGrid}
                  key={ID_SOMEDAY_DRAFT}
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
