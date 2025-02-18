import React, { FC } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { Categories_Event } from "@core/types/event.types";
import { COLUMN_WEEK, COLUMN_MONTH } from "@web/common/constants/web.constants";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  GRID_X_START,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";
import {
  Measurements_Grid,
  Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { GridEventPreview } from "@web/views/Calendar/components/Event/Grid/GridEventPreview/GridEventPreview";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

import { SomedayEventsColumn } from "./SomedayEventsColumn";
import { EventPlaceholder, SidebarList } from "../../styled";
import { SidebarProps } from "../../../Draft/hooks/sidebar/useSidebar";
import { State_Sidebar } from "../../../Draft/hooks/sidebar/useSidebarState";

interface Props {
  category: Categories_Event;
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  sidebarProps: SidebarProps;
  viewStart: WeekProps["component"]["startOfView"];
  gridScrollRef: Refs_Grid["gridScrollRef"];
}

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

export const SomedayEvents: FC<Props> = ({
  category,
  dateCalcs,
  measurements,
  sidebarProps,
  viewStart,
  gridScrollRef,
}) => {
  const { state, util } = sidebarProps;
  const gridX = state.mouseCoords.x - (SIDEBAR_OPEN_WIDTH + GRID_X_START);
  const dayIndex = dateCalcs.getDayNumberByX(gridX);

  const column =
    state.somedayEvents.columns[
      category === Categories_Event.SOMEDAY_WEEK ? COLUMN_WEEK : COLUMN_MONTH
    ];
  const events = getSomedayEvents(category, state.somedayEvents);

  const isDraftingNew = state.isDraftingNew && state.draftType === category;

  return (
    <DragDropContext onDragEnd={util.onDragEnd} onDragStart={util.onDragStart}>
      {state.shouldPreviewOnGrid && (
        <GridEventPreview
          dateCalcs={dateCalcs}
          dayIndex={dayIndex}
          event={state.draft}
          isOverAllDayRow={state.isOverAllDayRow}
          isOverMainGrid={state.isOverGrid}
          measurements={measurements}
          mouseCoords={state.mouseCoords}
          startOfView={viewStart}
          gridScrollRef={gridScrollRef}
        />
      )}

      <SidebarList>
        <div key={`${category}-wrapper`}>
          <SomedayEventsColumn
            category={category}
            column={column}
            draft={state.draft}
            events={events}
            isDraftingNew={isDraftingNew}
            isOverGrid={state.isOverGrid}
            key={COLUMN_WEEK}
            util={util}
          />
        </div>
        {!isDraftingNew && (
          <TooltipWrapper
            description={
              category === Categories_Event.SOMEDAY_MONTH
                ? "Add to month"
                : "Add to week"
            }
            onClick={() => sidebarProps.util.onPlaceholderClick(category)}
            shortcut={category === Categories_Event.SOMEDAY_MONTH ? "M" : "W"}
          >
            <EventPlaceholder>
              <Text size="l">+</Text>
            </EventPlaceholder>
          </TooltipWrapper>
        )}
      </SidebarList>
    </DragDropContext>
  );
};
