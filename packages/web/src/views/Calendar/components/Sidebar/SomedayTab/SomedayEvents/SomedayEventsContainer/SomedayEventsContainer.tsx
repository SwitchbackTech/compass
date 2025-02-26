import React, { FC } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Categories_Event } from "@core/types/event.types";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_SOMEDAY_DRAFT,
} from "@web/common/constants/web.constants";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { State_Sidebar } from "@web/views/Calendar/components/Draft/sidebar/hooks/useSidebarState";
import { DraggableSomedayEvent } from "../DraggableSomedayEvent/DraggableSomedayEvent";
import { DraggableSomedayEvents } from "../DraggableSomedayEvent/DraggableSomedayEvents";

const getSomedayEvents = (
  category: Categories_Event,
  somedayEvents: State_Sidebar["somedayEvents"],
) => {
  const colName =
    category === Categories_Event.SOMEDAY_WEEK ? COLUMN_WEEK : COLUMN_MONTH;
  const column = somedayEvents.columns[colName];

  return column.eventIds.map(
    (eventId: string) => somedayEvents.events[eventId],
  );
};

export interface Props {
  category: Categories_Event;
  column: {
    id: string;
  };
}

export const SomedayEventsContainer: FC<Props> = ({ category, column }) => {
  const { state } = useSidebarContext();

  const events = getSomedayEvents(category, state.somedayEvents);
  const draftCategory = useAppSelector(selectDraftCategory);
  const isDraftingNew = state.isDraftingNew && category === draftCategory;

  return (
    <>
      <Droppable droppableId={column.id}>
        {(provided) => {
          return (
            <div id="somedayColumn">
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <DraggableSomedayEvents
                  category={category}
                  draft={state.draft}
                  events={events}
                  isOverGrid={state.isOverGrid}
                />
                {provided.placeholder}
              </div>

              {isDraftingNew && state.draft && (
                <DraggableSomedayEvent
                  category={category}
                  draftId={ID_SOMEDAY_DRAFT}
                  event={state.draft}
                  index={events.length}
                  isDrafting={true}
                  isOverGrid={state.isOverGrid}
                  key={ID_SOMEDAY_DRAFT}
                />
              )}
            </div>
          );
        }}
      </Droppable>
    </>
  );
};
