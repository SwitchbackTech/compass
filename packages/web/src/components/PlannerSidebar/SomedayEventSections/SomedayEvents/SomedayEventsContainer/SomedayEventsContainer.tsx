import type React from "react";
import { type FC } from "react";
import {
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_SOMEDAY_DRAFT,
} from "@web/common/constants/web.constants";
import { DropZone } from "@web/components/DND/DropZone";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { useSomedayDropTargetRegistrationRef } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayDropTargetRegistry";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { SomedayEventItem } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventItem/SomedayEventItem";
import { AddSomedayEvent } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventsContainer/AddSomedayEvent";
import { useSomedayRefreshReserve } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventsContainer/useSomedayRefreshReserve";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { useSomedayEventsQueryStatus } from "@web/events/queries/useSomedayEventsQuery";
import {
  selectDraftCategory,
  useDraftStore,
} from "@web/events/stores/draft.store";

const getColName = (category: SomedayInteractionCategory) => {
  return category === Categories_Event.SOMEDAY_WEEK
    ? COLUMN_WEEK
    : COLUMN_MONTH;
};

const SOMEDAY_DROP_ZONE_ROW_SLOT_HEIGHT = 36;
const SOMEDAY_DROP_ZONE_BASE_HEIGHT = 44;

const getSomedayEventLimit = (category: SomedayInteractionCategory) =>
  category === Categories_Event.SOMEDAY_WEEK
    ? SOMEDAY_WEEKLY_LIMIT
    : SOMEDAY_MONTHLY_LIMIT;

const getAddTargetLabel = (category: SomedayInteractionCategory) =>
  category === Categories_Event.SOMEDAY_MONTH ? "month" : "week";

const getActiveDropZoneHeight = (
  eventCount: number,
  category: SomedayInteractionCategory,
) =>
  SOMEDAY_DROP_ZONE_BASE_HEIGHT +
  Math.min(eventCount, getSomedayEventLimit(category)) *
    SOMEDAY_DROP_ZONE_ROW_SLOT_HEIGHT;

export interface Props {
  category: SomedayInteractionCategory;
  events: Schema_Event[];
  isDraftingNew: boolean;
}

export const SomedayEventsContainer: FC<Props> = ({
  category,
  events,
  isDraftingNew,
}) => {
  const colName = getColName(category);
  const { actions, state } = useSidebarContext();
  const draftCategory = useDraftStore(selectDraftCategory);
  const dropTargetRef = useSomedayDropTargetRegistrationRef({
    category,
  });

  const { isFetching } = useSomedayEventsQueryStatus();
  const { reservedMinHeight, shouldAnimateRowEntrance } =
    useSomedayRefreshReserve(events.length, isFetching);

  const isDraftingThisCategory =
    state.isDraftingNew && category === draftCategory;
  const isBlockedDropTarget = state.blockedSomedayDropColumn === colName;
  const addTargetLabel = getAddTargetLabel(category);
  const addLabel = `Add item to ${addTargetLabel}`;
  const addShortcut =
    category === Categories_Event.SOMEDAY_MONTH
      ? ["Shift", "M"]
      : ["Shift", "W"];
  const activeDropZoneStyle: React.CSSProperties | undefined = state.isDragging
    ? {
        boxSizing: "border-box",
        height: getActiveDropZoneHeight(events.length, category),
      }
    : undefined;

  return (
    <DropZone
      id={colName}
      innerRef={dropTargetRef}
      isActive={state.isDragging && !state.isSomedayFormOpen}
      isInvalid={isBlockedDropTarget}
      className={state.isDragging ? "overflow-hidden" : undefined}
      style={activeDropZoneStyle}
    >
      <div
        className="flex flex-col"
        style={reservedMinHeight ? { minHeight: reservedMinHeight } : undefined}
      >
        {events.map((event, index) => (
          <SomedayEventItem
            animateEnter={shouldAnimateRowEntrance}
            category={category}
            draftId={state.draft?._id || ID_SOMEDAY_DRAFT}
            event={event}
            index={index}
            isDrafting={state.draft?._id === event._id}
            key={event?._id || "draft"}
          />
        ))}
      </div>

      {!isDraftingNew && !state.isDragging && (
        <div className="opacity-100">
          <TooltipWrapper
            description={`Add to ${addTargetLabel}`}
            placement="right"
            shortcut={addShortcut}
          >
            <AddSomedayEvent
              ariaLabel={addLabel}
              onCreate={() => actions.createSomedayDraft(category)}
            />
          </TooltipWrapper>
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
