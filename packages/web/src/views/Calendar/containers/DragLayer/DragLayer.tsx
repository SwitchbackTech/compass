import React, { FC, memo, useCallback, useEffect, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { getElemById } from "@web/common/utils/grid.util";
import { createPortal } from "react-dom";
import { ID_SOMEDAY_EVENTS } from "@web/common/constants/web.constants";

import { WeekProps } from "../../hooks/useWeek";
import { SomedayEventsProps } from "../../components/Sidebar/SomedaySection/hooks/useSomedayEvents";
import { StyledList } from "../../components/Sidebar/EventsList/styled";
import { WeekEventsColumn } from "../../components/Sidebar/SomedaySection/WeekColumn/WeekEventsColumn";

export interface Props {
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  somedayProps: SomedayEventsProps;
  viewStart: WeekProps["component"]["startOfView"];
}

export const DragLayer: FC<Props> = memo(function DragLayer({
  dateCalcs,
  measurements,
  somedayProps,
  viewStart,
}) {
  const [isLoadingDOM, setIsLoadingDOM] = useState(true);

  useEffect(() => {
    setIsLoadingDOM(false);
  }, []);

  const { state, util } = somedayProps;

  const getDraft = useCallback(
    (draftId: string) => {
      // console.log(draftId, state.somedayEvents.events[draftId]);
      return state.somedayEvents.events[draftId];
    },
    [state.somedayEvents.events]
  );

  if (isLoadingDOM) return null;

  return createPortal(
    <DragDropContext onDragEnd={util.onDragEnd} onDragStart={util.onDragStart}>
      <StyledList>
        {state.somedayEvents.columnOrder.map((columnId) => {
          const column = state.somedayEvents.columns[columnId];
          const weekEvents = column.eventIds.map(
            (eventId) => state.somedayEvents.events[eventId]
          );

          return (
            <div id="weekCol" key={`${columnId}-wrapper`}>
              <WeekEventsColumn
                column={column}
                dateCalcs={dateCalcs}
                draft={state.draft}
                events={weekEvents}
                getDraft={getDraft}
                isOverGrid={state.isOverGrid}
                key={columnId}
                measurements={measurements}
                mouseCoords={somedayProps.state.mouseCoords}
                util={util}
                viewStart={viewStart}
              />
            </div>
          );
        })}
      </StyledList>
    </DragDropContext>,
    getElemById(ID_SOMEDAY_EVENTS)
  );
});
