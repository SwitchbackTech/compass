import type React from "react";
import { type FC } from "react";
import {
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_SOMEDAY_DRAFT,
} from "@web/common/constants/web.constants";
import { DropZone } from "@web/components/DND/DropZone";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { type State_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarState";
import { useSomedayDropTargetRegistrationRef } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayDropTargetRegistry";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { SomedayEventItem } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventItem/SomedayEventItem";
import { AddSomedayEvent } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventsContainer/AddSomedayEvent";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";

const getColName = (category: SomedayInteractionCategory) => {
  return category === Categories_Event.SOMEDAY_WEEK
    ? COLUMN_WEEK
    : COLUMN_MONTH;
};

const SOMEDAY_EVENT_ROW_SLOT_HEIGHT = 36;
const SOMEDAY_DROP_ZONE_BASE_HEIGHT = 44;

const getSomedayEventLimit = (category: SomedayInteractionCategory) =>
  category === Categories_Event.SOMEDAY_WEEK
    ? SOMEDAY_WEEKLY_LIMIT
    : SOMEDAY_MONTHLY_LIMIT;

const getActiveDropZoneHeight = (
  eventCount: number,
  category: SomedayInteractionCategory,
) =>
  SOMEDAY_DROP_ZONE_BASE_HEIGHT +
  Math.min(eventCount, getSomedayEventLimit(category)) *
    SOMEDAY_EVENT_ROW_SLOT_HEIGHT;

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

  const events = getSomedayEvents(category, state.somedayEvents);
  const isDraftingThisCategory =
    state.isDraftingNew && category === draftCategory;
  const isBlockedDropTarget = state.blockedSomedayDropColumn === colName;
  const addLabel =
    category === Categories_Event.SOMEDAY_MONTH
      ? "Add to month"
      : "Add to week";
  const activeDropZoneStyle: React.CSSProperties | undefined = state.isDragging
    ? {
        boxSizing: "border-box",
        height: getActiveDropZoneHeight(events.length, category),
      }
    : undefined;

  // Render add someday event tooltip
  const renderWithTooltip = (children: React.ReactNode) => {
    return (
      <TooltipWrapper
        description={addLabel}
        placement="right"
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
      isInvalid={isBlockedDropTarget}
      className={state.isDragging ? "overflow-hidden" : undefined}
      style={activeDropZoneStyle}
    >
      {events.map((event, index) => (
        <SomedayEventItem
          category={category}
          draftId={state.draft?._id || ID_SOMEDAY_DRAFT}
          event={event}
          index={index}
          isDrafting={state.draft?._id === event._id}
          key={event?._id || "draft"}
        />
      ))}

      {!isDraftingNew && !state.isDragging && (
        <div className="opacity-100">
          {renderWithTooltip(
            <AddSomedayEvent
              ariaLabel={addLabel}
              onCreate={() => actions.createSomedayDraft(category)}
            />,
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
