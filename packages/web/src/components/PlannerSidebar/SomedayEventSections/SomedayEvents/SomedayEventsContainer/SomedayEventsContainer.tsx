import { Droppable } from "@hello-pangea/dnd";
import type React from "react";
import { type FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_SOMEDAY_DRAFT,
} from "@web/common/constants/web.constants";
import { DropZone } from "@web/components/DND/DropZone";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { type State_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarState";
import { DraggableSomedayEvent } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/DraggableSomedayEvent/DraggableSomedayEvent";
import { DraggableSomedayEvents } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/DraggableSomedayEvent/DraggableSomedayEvents";
import { AddSomedayEvent } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventsContainer/AddSomedayEvent";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";

const getColName = (category: Categories_Event) => {
  return category === Categories_Event.SOMEDAY_WEEK
    ? COLUMN_WEEK
    : COLUMN_MONTH;
};

const getSomedayEvents = (
  category: Categories_Event,
  somedayEvents: State_Sidebar["somedayEvents"],
) => {
  const colName = getColName(category);
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
  isDraftingNew: boolean;
}

export const SomedayEventsContainer: FC<Props> = ({
  category,
  column,
  isDraftingNew,
}) => {
  const colName = getColName(category);
  const { actions, state } = useSidebarContext();
  const draftCategory = useAppSelector(selectDraftCategory);

  const events = getSomedayEvents(category, state.somedayEvents);
  const isDraftingThisCategory =
    state.isDraftingNew && category === draftCategory;
  const addLabel =
    category === Categories_Event.SOMEDAY_MONTH
      ? "Add to month"
      : "Add to week";

  // Render add someday event tooltip
  const renderWithTooltip = (children: React.ReactNode) => {
    return (
      <TooltipWrapper
        description={addLabel}
        shortcut={
          category === Categories_Event.SOMEDAY_MONTH ? "Shift+M" : "Shift+W"
        }
      >
        {children}
      </TooltipWrapper>
    );
  };

  return (
    <Droppable droppableId={column.id}>
      {(provided, snapshot) => {
        return (
          <DropZone
            id={colName}
            innerRef={provided.innerRef}
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
              <div className={state.isDragging ? "opacity-0" : "opacity-100"}>
                {state.isDragging ? (
                  <AddSomedayEvent
                    ariaLabel={addLabel}
                    onCreate={() => actions.createSomedayDraft(category)}
                  />
                ) : (
                  renderWithTooltip(
                    <AddSomedayEvent
                      ariaLabel={addLabel}
                      onCreate={() => actions.createSomedayDraft(category)}
                    />,
                  )
                )}
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
  );
};
