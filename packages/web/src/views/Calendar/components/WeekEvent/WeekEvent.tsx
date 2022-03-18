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
import { getLeftPosition } from "@web/common/utils/grid.util";

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

  /**************
   Size + Position
   **************/
  const widths = Array.from(component.weekDaysRef.current?.children || []).map(
    (e) => e.clientWidth
  );
  let top = core.getEventCellHeight() * startTime;
  const category = getEventCategory(
    startDate,
    endDate,
    component.startOfSelectedWeekDay,
    component.endOfSelectedWeekDay
  );
  const left = getLeftPosition(category, startIndex, widths);
  // get duration by converting ms to hours
  const durationHours = endDate.diff(startDate) * 2.7777777777778e-7 || 0;
  let height = core.getEventCellHeight() * durationHours;
  let width =
    component.weekDaysRef.current?.children[startIndex].clientWidth || 0;
  // auto-deduct width for padding
  // TODO: handle width in CSS and without using hard-coded numbers, but rather %
  width -= 13;

  if (event.isAllDay) {
    const allDayRowHeight = core.getAllDayEventCellHeight();
    // why 4? cuz max # of rows?
    // $$ find # of events that can fit in max all-day row height
    height = core.getEventCellHeight() / 3;
    // height = core.getEventCellHeight();
    const order = event.allDayOrder || 1;
    top = allDayRowHeight - height * order;
    width = getAllDayEventWidth(
      category,
      startIndex,
      startDate,
      endDate,
      component.startOfSelectedWeekDay,
      widths
    );

    if (event.rowCount && event.rowOrder) {
      /*
      console.log(`${event.title}:
      maxCount: ${component.allDayEventsMaxCount}
      height: ${height}
      allDay-: ${allDayRowHeight}
      allDayOrder: ${event.allDayOrder}
      group Count: ${event.rowCount} 
      group order: ${event.rowOrder}
      `);
      top = height * event.rowOrder;
      */
    }
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
