import React, { FC, memo } from "react";
import {
  layerStyles,
  getItemStyles,
} from "@web/views/Calendar/containers/Drag/styled";
import { NewDraggableEvent } from "@web/views/Calendar/containers/Drag/NewDraggableEvent";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import {
  SIDEBAR_OPEN_WIDTH,
  GRID_X_START,
} from "@web/views/Calendar/layout.constants";
import { Schema_Event } from "@core/types/event.types";

import { NewDraggableSomedayEvent } from "../../EventsList/SomedayEvent/Wrappers/NewDraggableSomedayEvent";
import { SomedayEventsProps } from "../../../../hooks/draft/useSidebarDraft";
import { WeekColProps } from "./weekColumn.types";

export const WeekEvents: FC<{
  events: WeekColProps["events"];
  dateCalcs: DateCalcs;
  draftId: string;
  draft: Schema_Event;
  isDrafting: boolean;
  isOverGrid: boolean;
  measurements: Measurements_Grid;
  mouseCoords: { x: number; y: number };
  viewStart: WeekProps["component"]["startOfView"];
  util: SomedayEventsProps["util"];
}> = memo(
  ({
    dateCalcs,
    draftId,
    draft,
    events,
    isDrafting,
    isOverGrid,
    measurements,
    mouseCoords,
    util,
    viewStart,
  }) => {
    const gridX = mouseCoords.x - (SIDEBAR_OPEN_WIDTH + GRID_X_START);
    const dayIndex = dateCalcs.getDayNumberByX(gridX);
    const { x, y } = mouseCoords;

    return (
      <>
        {isOverGrid && (
          <div style={layerStyles}>
            <div style={getItemStyles({ x: 0, y: 0 }, { x, y })}>
              <NewDraggableEvent
                dateCalcs={dateCalcs}
                dayIndex={dayIndex}
                event={draft}
                isOverAllDayRow={false}
                isOverGrid={true}
                isOverMainGrid={true}
                measurements={measurements}
                mouseCoords={mouseCoords}
                startOfView={viewStart}
              />
            </div>
          </div>
        )}

        {events.map((event, index: number) => (
          <NewDraggableSomedayEvent
            event={event}
            draftId={draftId}
            index={index}
            isDrafting={isDrafting}
            isOverGrid={isOverGrid}
            key={event._id}
            util={util}
          />
        ))}
      </>
    );
  }
);
