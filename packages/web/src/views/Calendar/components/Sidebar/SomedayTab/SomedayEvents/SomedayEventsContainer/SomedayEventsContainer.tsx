import React, { FC } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Categories_Event } from "@core/types/event.types";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_SOMEDAY_DRAFT,
} from "@web/common/constants/web.constants";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { State_Sidebar } from "@web/views/Calendar/components/Draft/sidebar/hooks/useSidebarState";
import { DraggableSomedayEvent } from "../DraggableSomedayEvent/DraggableSomedayEvent";
import { DraggableSomedayEvents } from "../DraggableSomedayEvent/DraggableSomedayEvents";
import { AddSomedayEvent } from "./AddSomedayEvent";
import { DropZone } from "./Dropzone";

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
  onPlaceholderClick: (category: Categories_Event) => void;
  isDraftingNew: boolean;
}

export const SomedayEventsContainer: FC<Props> = ({
  category,
  column,
  onPlaceholderClick,
  isDraftingNew,
}) => {
  const context = useSidebarContext();
  const draftCategory = useAppSelector(selectDraftCategory);

  if (!context) return null; // TS Guard

  const { state } = context;
  const events = getSomedayEvents(category, state.somedayEvents);
  const isDraftingThisCategory =
    state.isDraftingNew && category === draftCategory;

  return (
    <>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => {
          return (
            <DropZone
              id="somedayColumn"
              ref={provided.innerRef}
              isActive={
                snapshot.isDraggingOver ||
                (state.isDragging && !state.isSomedayFormOpen)
              }
              {...provided.droppableProps}
            >
              <DraggableSomedayEvents
                category={category}
                draft={state.draft}
                events={events}
                isOverGrid={state.isOverGrid}
              />
              {provided.placeholder}

              {!isDraftingNew && (
                <div style={{ opacity: state.isDragging ? 0 : 1 }}>
                  <TooltipWrapper
                    description={
                      category === Categories_Event.SOMEDAY_MONTH
                        ? "Add to month"
                        : "Add to week"
                    }
                    onClick={() => onPlaceholderClick(category)}
                    shortcut={
                      category === Categories_Event.SOMEDAY_MONTH ? "M" : "W"
                    }
                  >
                    <AddSomedayEvent />
                  </TooltipWrapper>
                </div>
              )}

              {isDraftingThisCategory && state.draft && (
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
            </DropZone>
          );
        }}
      </Droppable>
    </>
  );
};
