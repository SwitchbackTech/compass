import dayjs from "dayjs";
import React from "react";

import { HOURS_AM_FORMAT } from "@web/common/constants/dates";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";

import { StyledEvent, StyledEventScaler } from "./styled";

export interface Props {
  event: Schema_GridEvent;
  weekViewProps: WeekViewProps;
}

const WeekEventComponent = (
  { event, weekViewProps }: Props,
  ref: React.ForwardedRef<HTMLDivElement>
) => {
  if (!event) return null;

  const { component, core, eventHandlers } = weekViewProps;

  const isActive = component.editingEvent?._id === event._id;
  const isPlaceholder =
    component.editingEvent?._id === event._id && !event.isEditing;

  /****
  Times
  *****/
  const eventStartDay = dayjs(event.startDate);
  const eventEndDay = dayjs(event.endDate);
  const startDay = eventStartDay.get("day");
  const startTime =
    component.times.indexOf(eventStartDay.format(HOURS_AM_FORMAT)) / 4;

  // ms to hours
  const duration = eventEndDay.diff(eventStartDay) * 2.7777777777778e-7;
  const eventEndShortAmTime = eventEndDay.format(HOURS_AM_FORMAT);

  /**************
   Size + Position
   **************/
  let top = core.getEventCellHeight() * startTime;
  let height = core.getEventCellHeight() * duration;
  let width =
    component.weekDaysRef.current?.children[startDay].clientWidth || 0;
  width -= 15; // where is this number coming from ?
  let left = core.getLeftPositionByDayIndex(startDay);

  if (event.isAllDay) {
    height = core.getEventCellHeight() / 4;
    const eventOrder = event.allDayOrder || 1;
    top = core.getAllDayEventCellHeight() - height * eventOrder;

    width = core.getAllDayEventWidth(
      startDay,
      eventEndDay.diff(eventStartDay, "days")
    );
  }

  if (event.groupCount && event.groupOrder) {
    width /= event.groupCount;
    left += event.groupOrder * width - width;
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
      duration={+duration.toFixed(2) || 0.25}
      allDay={event.isAllDay || false}
    >
      <Flex flexWrap={FlexWrap.WRAP} alignItems={AlignItems.CENTER}>
        <Text size={10}>
          {event.title}
          <SpaceCharacter />
        </Text>

        {event.isTimeSelected && event.showStartTimeLabel && (
          <Text lineHeight={7} size={7}>
            {eventStartDay.format(HOURS_AM_FORMAT)}
            {eventEndShortAmTime && ` - ${eventEndShortAmTime}`}
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
