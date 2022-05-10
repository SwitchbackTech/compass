import React, { FC } from "react";
import { useDrop } from "react-dnd";
import mergeRefs from "react-merge-refs";
import { DragItem } from "@web/common/types/dnd.types";
import { YEAR_MONTH_DAY_FORMAT } from "@web/common/constants/dates";
import {
  StyledEvents,
  StyledGridColumns,
  StyledGridCol,
} from "@web/views/Calendar/styled";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { EditingWeekEvent } from "@web/views/Calendar/components/EditingWeekEvent";
import { NowLine } from "@web/views/Calendar/components/NowLine";
import { TimesColumn } from "@web/views/Calendar/components/TimesColumn";
import { WeekEvent } from "@web/views/Calendar/components/WeekEvent";
import { SIDEBAR_WIDTH } from "@web/views/Calendar/calendar.constants";

import { GridRows } from "../GridRows";
import { StyledMainGrid, StyledPrevDaysOverflow } from "./styled";

interface Props {
  weekViewProps: WeekViewProps;
}

export const MainGrid: FC<Props> = ({ weekViewProps }) => {
  const { component, core, eventHandlers } = weekViewProps;

  const convertSomedayEvent = (x: number, y: number) => {
    const date = dateByCoordinates(x, y);
    console.log(date);
    // dispatch code (notion)
  };

  const dateByCoordinates = (x: number, y: number) => {
    const clickX = x - component.CALCULATED_GRID_X_OFFSET - SIDEBAR_WIDTH;

    const yOffset = core.getYOffset();
    const clickY = y - yOffset;

    const dayIndex = core.getDayNumberByX(clickX);
    const minutes = core.getMinuteByMousePosition(clickY);
    const date = component.startOfSelectedWeekDay
      .add(dayIndex, "day")
      .add(minutes, "minutes")
      .format("YYYY-MM-DD HH:mm");

    return date;
  };

  const [, drop] = useDrop(
    () => ({
      accept: DragItem.EVENT_SOMEDAY,
      drop: (item, monitor) => {
        const { x, y } = monitor.getClientOffset();

        convertSomedayEvent(x, y);
      },
    }),
    []
  );

  return (
    <StyledMainGrid
      ref={mergeRefs([component.eventsGridRef, drop])}
      onMouseDown={eventHandlers.onEventsGridMouseDown}
      onMouseMove={eventHandlers.onEventGridMouseMove}
    >
      <TimesColumn />

      <StyledGridColumns>
        {component.week === component.today.week() && <NowLine width={100} />}
        <StyledPrevDaysOverflow widthPercent={core.getPastOverflowWidth()} />

        {component.weekDays.map((day) => (
          <StyledGridCol
            flexBasis={core.getFlexBasisWrapper(day)}
            key={day.format(YEAR_MONTH_DAY_FORMAT)}
          />
        ))}
      </StyledGridColumns>

      <GridRows />
      <StyledEvents>
        {component.weekEvents.map((event: Schema_GridEvent) => (
          <WeekEvent
            key={event._id}
            weekViewProps={weekViewProps}
            event={event}
          />
        ))}

        {component.editingEvent && !component.editingEvent.isAllDay && (
          <EditingWeekEvent
            setEvent={(event) =>
              eventHandlers.setEditingEvent(event as Schema_GridEvent)
            }
            isOpen={!!component.editingEvent?.isOpen}
            event={component.editingEvent}
            weekViewProps={weekViewProps}
            onCloseEventForm={() => eventHandlers.setEditingEvent(null)}
            onSubmitEventForm={eventHandlers.onSubmitEvent}
          />
        )}
      </StyledEvents>
    </StyledMainGrid>
  );
};
