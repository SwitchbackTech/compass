import React from "react";
import dayjs from "dayjs";
import { HOURS_AM_FORMAT } from "@web/common/constants/dates";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { getEventCategory } from "@web/ducks/events/event.utils";
import {
  getAllDayEventWidth,
  getLeftPosition,
  getLineClamp,
} from "@web/common/utils/grid.util";
import {
  EVENT_PADDING_RIGHT,
  EVENT_PADDING_WIDTH,
} from "@web/common/constants/grid.constants";
import { Category } from "@web/ducks/events/types";
import { MS_IN_HR } from "@core/core.constants";

import { StyledEvent, StyledEventScaler } from "./styled";
import { Times } from "./Times";

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

  /************
   Date + Times
   ************/
  const startDate = dayjs(event.startDate);
  const startIndex = startDate.get("day");

  const endDate = dayjs(event.endDate);

  const durationHours = endDate.diff(startDate) * MS_IN_HR || 0;

  /**************
   Size + Position
   **************/
  let top: number;
  let width = -EVENT_PADDING_WIDTH;
  let height: number;
  const category = getEventCategory(
    startDate,
    endDate,
    component.startOfSelectedWeekDay,
    component.endOfSelectedWeekDay
  );
  const left = getLeftPosition(category, startIndex, component.columnWidths);

  // console.log("calculating for ", event.title);
  if (event.isAllDay) {
    height = core.getAllDayEventCellHeight();
    top = 25.26 * (event.row || 1); // found by experimenting with what 'looked right'
    // top = 25.26 * event.row; // found by experimenting with what 'looked right'
    width = getAllDayEventWidth(
      category,
      startIndex,
      startDate,
      endDate,
      component.startOfSelectedWeekDay,
      component.columnWidths
    );
    if (category === Category.PastToThisWeek) {
      console.log(event.startDate);
      // console.log(
      //   `${category}\n${startIndex}\n${startDate.toString()}\n${endDate.toString()}\n${component.startOfSelectedWeekDay.toString()}\n${JSON.stringify(
      //     widths
      //   )}`
      // );
    }
  } else {
    const startTime =
      component.times.indexOf(startDate.format(HOURS_AM_FORMAT)) / 4;

    top = core.getHourlyCellHeight() * startTime;
    height = core.getHourlyCellHeight() * durationHours;

    const colWidth = core.getColumnWidth(startIndex);
    width = colWidth - EVENT_PADDING_RIGHT || 0;
  }

  return (
    <StyledEvent
      allDay={event.isAllDay || false}
      className={isActive ? "active" : ""}
      duration={+durationHours.toFixed(2) || 0.25}
      height={height}
      isDragging={component.eventState?.name === "dragging"}
      isPlaceholder={isPlaceholder}
      left={left}
      lineClamp={event.isAllDay ? 1 : getLineClamp(durationHours)}
      onMouseDown={(e) => eventHandlers.onEventMouseDown(e, event)}
      priority={event.priority}
      ref={ref}
      role="button"
      tabindex="0"
      top={top}
      width={width}
    >
      <Flex
        alignItems={AlignItems.CENTER}
        flexWrap={FlexWrap.WRAP}
        title={event.title}
      >
        <Text size={13} role="textbox">
          {event.title}
          <SpaceCharacter />
        </Text>
      </Flex>

      {!event.isAllDay && (
        <Flex flexWrap={FlexWrap.WRAP}>
          <Times endDate={endDate} event={event} startDate={startDate} />
        </Flex>
      )}

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
