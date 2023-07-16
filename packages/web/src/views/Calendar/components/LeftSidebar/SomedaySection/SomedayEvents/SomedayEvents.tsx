import React, { FC } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { Categories_Event } from "@core/types/event.types";
import { COLUMN_WEEK, COLUMN_MONTH } from "@web/common/constants/web.constants";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  GRID_X_START,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { SomedayEventsProps } from "@web/views/Calendar/hooks/draft/sidebar/useSidebar";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { GridEventPreview } from "@web/views/Calendar/components/Event/Grid/GridEventPreview/GridEventPreview";

import { SomedayEventsColumn } from "./SomedayEventsColumn";
import { StyledSidebarList } from "../../styled";

interface Props {
  category: Categories_Event;
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  somedayProps: SomedayEventsProps;
  viewStart: WeekProps["component"]["startOfView"];
}

export const SomedayEvents: FC<Props> = ({
  category,
  dateCalcs,
  measurements,
  somedayProps,
  viewStart,
}) => {
  const { state, util } = somedayProps;
  const gridX = state.mouseCoords.x - (SIDEBAR_OPEN_WIDTH + GRID_X_START);
  const dayIndex = dateCalcs.getDayNumberByX(gridX);

  const colName =
    category === Categories_Event.SOMEDAY_WEEK ? COLUMN_WEEK : COLUMN_MONTH;
  const column = state.somedayEvents.columns[colName];
  const events = column.eventIds.map(
    (eventId: string) => state.somedayEvents.events[eventId]
  );

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
        />
      )}

      <StyledSidebarList onClick={() => util.onSectionClick(category)}>
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
      </StyledSidebarList>
    </DragDropContext>
  );
};
