import React, { FC } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";
import { Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SomedayEventsProps } from "@web/views/Calendar/hooks/draft/sidebar/useSidebar";

import { DraggableSomedayEvent } from "./Wrappers/DraggableSomedayEvent";
import { DraggableSomedayEvents } from "./Wrappers/DraggableSomedayEvents";

export interface Props {
  column: {
    id: string;
  };
  draft: Schema_GridEvent;
  events: Schema_Event[];
  isDraftingNew: boolean;
  isOverGrid: boolean;
  util: SomedayEventsProps["util"];
}

export const SomedayEventsColumn: FC<Props> = ({
  column,
  draft,
  events,
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
                <DraggableSomedayEvents
                  draft={draft}
                  events={events}
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
