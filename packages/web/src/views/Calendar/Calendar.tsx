import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import dayjs from "dayjs";
import { Key } from "ts-keycode-enum";
import { Popover } from "react-tiny-popover";
import {
  getEventCategory,
  getWeekDayLabel,
} from "@web/ducks/events/event.utils";
import { getAmPmTimes, getHourlyTimes } from "@web/common/utils/date.utils";
import { ColorNames } from "@web/common/types/styles";
import {
  AlignItems,
  FlexDirections,
  JustifyContent,
} from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  HOURS_AM_FORMAT,
  YEAR_MONTH_DAY_FORMAT,
} from "@web/common/constants/dates";
import { getAlphaColor, getColor } from "@web/common/utils/colors";
import { Text } from "@web/components/Text";
import { EditingWeekEvent } from "@web/views/Calendar/components/EditingWeekEvent";
import { WeekEvent } from "@web/views/Calendar/components/WeekEvent";
import { useToken } from "@web/common/hooks/useToken";
// import { Sidebar } from "@web/views/Calendar/components/Sidebar";

import { getLeftPosition } from "@web/common/utils/grid.util";
import { isEqual } from "lodash";

import {
  useGetWeekViewProps,
  WeekViewProps,
} from "./weekViewHooks/useGetWeekViewProps";
import { Schema_GridEvent } from "./weekViewHooks/types";
import {
  ArrowNavigationButton,
  Styled,
  StyledAllDayEventsGrid,
  StyledCalendar,
  StyledGridCol,
  StyledGridRow,
  StyledGridRows,
  StyledHeaderFlex,
  StyledEventsGrid,
  StyledGridColumns,
  StyledNavigationButtons,
  StyledDayTimes,
  StyledEvents,
  StyledWeekDayFlex,
  StyledWeekDaysFlex,
  StyledTodayPopoverContainer,
  StyledPrevDaysOverflow,
  TodayNavigationButton,
} from "./styled";
import { TodayButtonPopover } from "./components/TodayButtonPopover/TodayButtonPopover";

export interface Props {
  weekViewProps: WeekViewProps;
}

const dayTimes = getHourlyTimes(dayjs());
const times = getAmPmTimes();

const getTopRoundedPosition = (startDate: string, eventCellheight: number) => {
  const startTimeIndex =
    times.indexOf(dayjs(startDate).format(HOURS_AM_FORMAT)) / 4;

  const top = eventCellheight * startTimeIndex;

  return top;
};

/* So this is not most efficient way of doing it.
The best way in our situation is to change editingEvent state in following way:
when we are moving it we should change start and end date only when it is devideable by 15mins.
Now each event rerenders when it's not moving.
It is fixed within way below.

But it would be better if we set correct start end end date for event when we changing it's position
(so we have to move this solution to onEventDrag() in "useGetWeekViewProps")
*/
const compare = (prevProps: Props, nextProps: Props) => {
  const { component: prevComponent } = prevProps.weekViewProps || {};
  const { core, component: nextComponent } = nextProps.weekViewProps || {};

  const {
    startDate: prevStartDate,
    endDate: prevEndDate,
    ...prevEditingEvent
  } = prevComponent.editingEvent || {};

  const {
    startDate: nextStartDate,
    endDate: nextEndDate,
    ...nextEditingEvent
  } = nextComponent.editingEvent || {};

  const eventCellheight = nextProps.weekViewProps.core.getEventCellHeight();

  const prevTop = getTopRoundedPosition(prevStartDate, eventCellheight);
  const nextTop = getTopRoundedPosition(nextStartDate, eventCellheight);

  const prevStartIndex = dayjs(prevStartDate).get("day");
  const nextStartIndex = dayjs(nextStartDate).get("day");

  const prevCategory = getEventCategory(
    dayjs(prevStartDate),
    dayjs(prevEndDate),
    prevProps?.weekViewProps?.component.startOfSelectedWeekDay,
    prevProps?.weekViewProps?.component.endOfSelectedWeekDay
  );

  const nextCategory = getEventCategory(
    dayjs(nextStartDate),
    dayjs(nextEndDate),
    nextProps?.weekViewProps?.component.startOfSelectedWeekDay,
    nextProps?.weekViewProps?.component.endOfSelectedWeekDay
  );

  const widths = Array.from(
    nextProps?.weekViewProps?.component.weekDaysRef.current?.children || []
  ).map((e) => e.clientWidth);

  const prevLeft = getLeftPosition(prevCategory, prevStartIndex, widths);
  const nextLeft = getLeftPosition(nextCategory, nextStartIndex, widths);

  const areWeeksLengthSame =
    prevProps.weekViewProps.component.weekEvents.length ===
    nextProps.weekViewProps.component.weekEvents.length;

  const prevDurationHours =
    dayjs(prevEndDate).diff(prevStartDate) * 2.7777777777778e-7 || 0;

  const nextDurationHours =
    dayjs(nextEndDate).diff(nextStartDate) * 2.7777777777778e-7 || 0;

  const prevHeight = core.getEventCellHeight() * prevDurationHours;
  const nextHeight = core.getEventCellHeight() * nextDurationHours;

  const areTopsSame = prevTop === nextTop;

  const areLeftsSame = prevLeft === nextLeft;

  const areHeightsSame = prevHeight === nextHeight;

  const areEventsEqual = isEqual(prevEditingEvent, nextEditingEvent);

  return (
    areWeeksLengthSame &&
    areTopsSame &&
    areLeftsSame &&
    areHeightsSame &&
    areEventsEqual
  );
};

export const CalendarView: React.FC<Props> = React.memo(({ weekViewProps }) => {
  const { token } = useToken();

  const { component, core, eventHandlers } = weekViewProps;

  // const [isLoading, setIsLoading] = useState(true);
  const [, setResize] = useState<
    { width: number; height: number } | undefined
  >();

  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      eventHandlers.setEditingEvent((editingEvent) => {
        if (editingEvent) return editingEvent;

        const handlersByKey = {
          [Key.C]: () => eventHandlers.setEditingEvent({} as Schema_GridEvent),
          [Key.N]: () => eventHandlers.setWeek((week) => week + 1),
          [Key.P]: () => eventHandlers.setWeek((week) => week - 1),
        } as { [key: number]: () => void };

        const handler = handlersByKey[e.which];
        if (!handler) return editingEvent;

        setTimeout(handler);

        return editingEvent;
      });
    };

    const mouseUpHandler = (e: MouseEvent) => {
      setTimeout(() =>
        eventHandlers.onEventsGridRelease(e as unknown as React.MouseEvent)
      );
    };

    const contextMenuHandler = (e: MouseEvent) => e.preventDefault();

    const resizeHandler = () => {
      setResize({ width: window.innerWidth, height: window.innerHeight });
    };

    document.addEventListener("keydown", keyDownHandler);
    document.addEventListener("mouseup", mouseUpHandler);
    document.addEventListener("contextmenu", contextMenuHandler);
    window.addEventListener("resize", resizeHandler);

    return () => {
      document.addEventListener("contextmenu", contextMenuHandler);
      document.removeEventListener("keydown", keyDownHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  useEffect(() => {
    if (!component.eventsGridRef.current) return;

    // scroll down to the current time in grid
    const minuteHeight = core.getEventCellHeight() / 60;
    const minutes = dayjs().get("hours") * 60 + dayjs().get("minutes");
    const top = minutes * minuteHeight;

    component.eventsGridRef.current.scroll({ top, behavior: "smooth" });
  }, [component.calendarRef]);

  if (!token) {
    return <Navigate to={ROOT_ROUTES.LOGIN} />;
  }

  return (
    <Styled>
      {/* <Sidebar
        onTransitionEnd={() =>
          setResize({ height: window.innerHeight, width: window.innerWidth })
        }
      /> */}
      <StyledCalendar
        ref={component.calendarRef}
        direction={FlexDirections.COLUMN}
        onMouseDown={eventHandlers.onCalendarAreaMouseDown}
      >
        <StyledHeaderFlex alignItems={AlignItems.CENTER}>
          <div role="heading" aria-level={1}>
            <Text colorName={ColorNames.WHITE_1} size={45}>
              {component.dayjsBasedOnWeekDay.format("MMMM")}
            </Text>

            <SpaceCharacter />

            <Text colorName={ColorNames.DARK_5} size={45}>
              {component.dayjsBasedOnWeekDay.format("YYYY")}
            </Text>
          </div>

          <StyledNavigationButtons>
            <ArrowNavigationButton
              size={40}
              colorName={ColorNames.DARK_5}
              onClick={() =>
                eventHandlers.setWeek((actualWeek) => actualWeek - 1)
              }
              cursor="pointer"
            >
              {"<"}
            </ArrowNavigationButton>

            <ArrowNavigationButton
              size={40}
              colorName={ColorNames.DARK_5}
              onClick={() =>
                eventHandlers.setWeek((actualWeek) => +actualWeek + 1)
              }
              cursor="pointer"
            >
              {">"}
            </ArrowNavigationButton>

            {component.today.week() !== component.week && (
              <TodayButtonPopover
                today={component.today.format("dddd, MMMM D")}
                onClick={() => eventHandlers.setWeek(component.today.week())}
              />
            )}
          </StyledNavigationButtons>
        </StyledHeaderFlex>

        <StyledWeekDaysFlex ref={component.weekDaysRef}>
          {component.weekDays.map((day) => {
            const isDayInCurrentWeek =
              component.today.week() === component.week;
            const isToday =
              isDayInCurrentWeek &&
              component.today.format("DD") === day.format("DD");

            let weekDayTextColor = isToday
              ? getColor(ColorNames.TEAL_3)
              : getAlphaColor(ColorNames.WHITE_1, 0.72);

            let dayNumberToDisplay = day.format("D");

            dayNumberToDisplay =
              day.format("MM") !==
                component.startOfSelectedWeekDay.format("MM") &&
              day.format("D") === "1"
                ? day.format("MMM D")
                : dayNumberToDisplay;

            if (day.isBefore(component.today, "day")) {
              weekDayTextColor = getAlphaColor(ColorNames.WHITE_1, 0.55);
            }

            const flexBasis = core.getFlexBasisWrapper(day);

            return (
              <StyledWeekDayFlex
                justifyContent={JustifyContent.CENTER}
                key={getWeekDayLabel(day)}
                alignItems={AlignItems.FLEX_END}
                id={`id-${getWeekDayLabel(day)}`}
                color={weekDayTextColor}
                flexBasis={flexBasis}
              >
                <Text lineHeight={26} size={26}>
                  {dayNumberToDisplay}
                </Text>
                <SpaceCharacter />
                <Text size={12}>{day.format("ddd")}</Text>
              </StyledWeekDayFlex>
            );
          })}
        </StyledWeekDaysFlex>

        <StyledAllDayEventsGrid
          id="allDayGrid"
          rowsCount={component.rowsCount}
          onMouseDown={eventHandlers.onAllDayEventsGridMouseDown}
          onMouseMove={eventHandlers.onEventGridMouseMove}
          ref={component.allDayEventsGridRef}
        >
          <StyledGridColumns>
            {component.weekDays.map((day) => (
              <StyledGridCol
                flexBasis={core.getFlexBasisWrapper(day)}
                key={day.format(YEAR_MONTH_DAY_FORMAT)}
              />
            ))}
          </StyledGridColumns>

          <StyledEvents>
            {component.allDayEvents.map((event: Schema_GridEvent) => (
              <WeekEvent
                event={event}
                key={event._id}
                weekViewProps={weekViewProps}
              />
            ))}

            {component.editingEvent && component.editingEvent.isAllDay && (
              <EditingWeekEvent
                event={component.editingEvent}
                isOpen={!!component.editingEvent.isOpen}
                onCloseEventForm={() => eventHandlers.setEditingEvent(null)}
                onSubmitEventForm={eventHandlers.onSubmitEvent}
                setEvent={(event) => eventHandlers.setEditingEvent(event)}
                weekViewProps={weekViewProps}
              />
            )}
          </StyledEvents>
        </StyledAllDayEventsGrid>

        <StyledEventsGrid
          ref={component.eventsGridRef}
          onMouseDown={eventHandlers.onEventsGridMouseDown}
          onMouseMove={eventHandlers.onEventGridMouseMove}
        >
          <StyledDayTimes>
            {dayTimes.map((time, index) => (
              <div key={`${time}-${index}`}>
                <Text size={9}>{time}</Text>
              </div>
            ))}
          </StyledDayTimes>
          <StyledGridColumns>
            <StyledPrevDaysOverflow
              widthPercent={core.getPastOverflowWidth()}
            />

            {component.weekDays.map((day) => (
              <StyledGridCol
                flexBasis={core.getFlexBasisWrapper(day)}
                key={day.format(YEAR_MONTH_DAY_FORMAT)}
              />
            ))}
          </StyledGridColumns>

          <StyledGridRows>
            {dayTimes.map((dayTime, index) => (
              <StyledGridRow key={`${dayTime}-${index}:dayTimes`} />
            ))}
          </StyledGridRows>

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
        </StyledEventsGrid>
      </StyledCalendar>
    </Styled>
  );
}, compare);
