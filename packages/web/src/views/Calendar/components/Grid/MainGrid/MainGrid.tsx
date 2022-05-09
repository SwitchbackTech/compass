import React, { FC } from "react";
import { roundByNumber } from "@web/common/utils";
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
import {
  GRID_TIME_STEP,
  SIDEBAR_WIDTH,
} from "@web/views/Calendar/calendar.constants";

import { GridRows } from "../GridRows";
import { StyledMainGrid, StyledPrevDaysOverflow } from "./styled";

interface Props {
  weekViewProps: WeekViewProps;
}

export const MainGrid: FC<Props> = ({ weekViewProps }) => {
  const { component, core, eventHandlers } = weekViewProps;
  console.log(`${component.CALCULATED_GRID_Y_OFFSET} [Main]`);

  const convertSomedayEvent = (x: number, y: number) => {
    const date = dateByCoordinates(x, y);
    // dispatch code (notion)
  };

  // const height = core.getEventCellHeight();
  const gridHeight = component.eventsGridRef.current?.clientHeight || 0;
  const scrollTop = gridHeight / 11 || 0;

  const _minByY = (y: number) => {
    const minutesOnGrid = Math.round((y + scrollTop / gridHeight) * 60);

    // uncoment once working to get rounding to work
    // const minute = roundByNumber(
    //   minutesOnGrid - GRID_TIME_STEP / 2,
    //   GRID_TIME_STEP
    // );

    // return minute;
    return minutesOnGrid;
  };

  const dateByCoordinates = (x: number, y: number) => {
    // const _dateByMousePosition = core.getDateByMousePosition(x, y);
    // console.log(`
    // START:
    //     gridHeight ${gridHeight}
    //     scrollTop: ${scrollTop}
    //     ----
    //     orig date: ${_dateByMousePosition}
    //     `);

    const clickX = x - component.CALCULATED_GRID_X_OFFSET - SIDEBAR_WIDTH;

    const yOffset = core.getYOffset();
    const clickY = y - yOffset;
    console.log(`
    CLICKS:
        ${x} -> ${clickX}
        ${y} -> ${clickY}
        `);
    // minByY: ${_minByY(y)}
    // minByAdjustedY: ${_minByY(clickY)}

    const dayIndex = core.getDayNumberByX(clickX);
    const minutes = core.getMinuteByMousePosition(clickY);
    // console.log("minutes", minutes);
    // console.log(component.startOfSelectedWeekDay.add(1, "day").add(minutes, "m"));
    const date = component.startOfSelectedWeekDay
      .add(dayIndex, "day")
      .add(minutes, "minutes")
      .format("YYYY-MM-DD HH:mm");

    console.log(date);
    return date;
  };

  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      accept: DragItem.EVENT_SOMEDAY,
      collect: (monitor) => ({
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver(),
      }),
      //   hover: () => console.log("hover grid"),
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
