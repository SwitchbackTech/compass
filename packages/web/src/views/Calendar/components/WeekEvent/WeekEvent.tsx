import dayjs from "dayjs";
import React from "react";
import { HOURS_AM_FORMAT } from "@web/common/constants/dates";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import {
  getAllDayEventWidth,
  getEventCategory,
} from "@web/ducks/events/event.utils";
import {
  getAllDayEventTop,
  getLeftPosition,
} from "@web/common/utils/grid.util";

import { StyledEvent, StyledEventScaler } from "./styled";

export interface Props {
  event: Schema_GridEvent;
  weekViewProps: WeekViewProps;
}

const WeekEventComponent = (
  { event, weekViewProps }: Props,
  ref: React.ForwardedRef<HTMLButtonElement>
) => {
  if (!event) return null;

  const { component, core, eventHandlers } = weekViewProps;

  /*****
  State
  *****/
  const isActive = component.editingEvent?._id === event._id;
  const isPlaceholder =
    component.editingEvent?._id === event._id && !event.isEditing;

  /****
  Times
  *****/
  const startDate = dayjs(event.startDate);
  const startIndex = startDate.get("day");
  const startTime =
    component.times.indexOf(startDate.format(HOURS_AM_FORMAT)) / 4;
  const endDate = dayjs(event.endDate);
  const endTimeShortAm = endDate.format(HOURS_AM_FORMAT);
  // get duration by converting ms to hours
  const durationHours = endDate.diff(startDate) * 2.7777777777778e-7 || 0;

  /**************
   Size + Position
   **************/
  let top: number;
  // auto-deduct width for padding
  // TODO: handle width in CSS and without using hard-coded numbers, but rather %
  let width = -13;
  let height: number;
  const widths = Array.from(component.weekDaysRef.current?.children || []).map(
    (e) => e.clientWidth
  );
  const category = getEventCategory(
    startDate,
    endDate,
    component.startOfSelectedWeekDay,
    component.endOfSelectedWeekDay
  );
  const left = getLeftPosition(category, startIndex, widths);

  if (event.isAllDay) {
    /* 
    height notes
      - uses dynamic style; height changes based on window size; no min/max
      - setting to a constant (20 e.g) requires the allday row height to also have
        a max. otherwise, events will appear out of place
     - got 2.62 by experimenting by what looks right
    */
    height = core.getEventCellHeight() / 2.62;
    const allDayRowHeight = core.getAllDayEventCellHeight();
    console.log(event.title);
    top = getAllDayEventTop(height, event.row, allDayRowHeight);
    width = getAllDayEventWidth(
      category,
      startIndex,
      startDate,
      endDate,
      component.startOfSelectedWeekDay,
      widths
    );
    console.log(component.rowsCount);
    // $$
    // console.log(`${event.title}:
    // maxCount: ${component.rowsCount}
    // top: ${top}
    // height: ${height}
    // allDay-: ${allDayRowHeight}
    // allDayOrder: ${event.allDayOrder}
    // row: ${event.row}
    // `);
  } else {
    top = core.getEventCellHeight() * startTime;
    height = core.getEventCellHeight() * durationHours;
    width =
      component.weekDaysRef.current?.children[startIndex].clientWidth || 0;
  }

  return (
    <StyledEvent
      ref={ref}
      height={height}
      isPlaceholder={isPlaceholder}
      isDragging={component.eventState?.name === "dragging"}
      className={isActive ? "active" : ""}
      onMouseDown={(e) => eventHandlers.onEventMouseDown(e, event)}
      priority={event.priority}
      left={left}
      width={width}
      top={top}
      isTimeShown={!!event.isTimeSelected}
      duration={+durationHours.toFixed(2) || 0.25}
      allDay={event.isAllDay || false}
    >
      <Flex flexWrap={FlexWrap.WRAP} alignItems={AlignItems.CENTER}>
        <Text size={10}>
          {event.title}
          <SpaceCharacter />
        </Text>

        {event.isTimeSelected && event.showStartTimeLabel && (
          <Text lineHeight={7} size={7}>
            {startDate.format(HOURS_AM_FORMAT)}
            {endTimeShortAm && ` - ${endTimeShortAm}`}
          </Text>
        )}
      </Flex>

      {component.eventState?.name !== "dragging" && !event.isAllDay && (
        <>
          <StyledEventScaler
            top="-5px"
            onMouseDown={(e) =>
              eventHandlers.onScalerMouseDown(e, event, "startDate")
            }
            onMouseMove={eventHandlers.onEventGridMouseMove}
          />

          <StyledEventScaler
            bottom="-5px"
            onMouseDown={(e) =>
              eventHandlers.onScalerMouseDown(e, event, "endDate")
            }
            onMouseMove={eventHandlers.onEventGridMouseMove}
          />
        </>
      )}
    </StyledEvent>
  );
};

export const WeekEvent = React.forwardRef(WeekEventComponent);
