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
import {
  getSomedayInteractionDropTargetAttributes,
  useSomedayDropTargetRegistrationRef,
} from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayDropTargetRegistry";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { SomedayEventItem } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventItem/SomedayEventItem";
import { SomedayEventItems } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventItem/SomedayEventItems";
import { AddSomedayEvent } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventsContainer/AddSomedayEvent";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";

const getColName = (category: SomedayInteractionCategory) => {
  return category === Categories_Event.SOMEDAY_WEEK
    ? COLUMN_WEEK
    : COLUMN_MONTH;
};

const getSomedayEvents = (
  category: SomedayInteractionCategory,
  somedayEvents: State_Sidebar["somedayEvents"],
) => {
  const colName = getColName(category);
  const column = somedayEvents.columns[colName];

  return column.eventIds.map(
    (eventId: string) => somedayEvents.events[eventId],
  );
};

export interface Props {
  category: SomedayInteractionCategory;
  isDraftingNew: boolean;
}

export const SomedayEventsContainer: FC<Props> = ({
  category,
  isDraftingNew,
}) => {
  const colName = getColName(category);
  const { actions, state } = useSidebarContext();
  const draftCategory = useAppSelector(selectDraftCategory);
  const dropTargetRef = useSomedayDropTargetRegistrationRef({
    category,
  });
  const dropTargetAttributes = getSomedayInteractionDropTargetAttributes({
    category,
  });

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
    <DropZone
      id={colName}
      innerRef={dropTargetRef}
      isActive={state.isDragging && !state.isSomedayFormOpen}
      {...dropTargetAttributes}
    >
      <SomedayEventItems
        category={category}
        draft={state.draft}
        events={events}
      />

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
        <SomedayEventItem
          category={category}
          draftId={ID_SOMEDAY_DRAFT}
          event={state.draft}
          index={events.length}
          isDrafting={true}
          key={ID_SOMEDAY_DRAFT}
        />
      )}
    </DropZone>
  );
};
