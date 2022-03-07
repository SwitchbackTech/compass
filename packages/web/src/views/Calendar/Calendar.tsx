import React, { useEffect, useState } from "react";
import { Redirect } from "react-router-dom";
import dayjs from "dayjs";
import { Key } from "ts-keycode-enum";
import { Popover } from "react-tiny-popover";
import { getWeekDayLabel } from "@web/ducks/events/event.utils";
import { getHourlyTimes } from "@web/common/utils/date.utils";
import { ColorNames } from "@web/common/types/styles";
import {
  AlignItems,
  FlexDirections,
  JustifyContent,
} from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { YEAR_MONTH_DAY_FORMAT } from "@web/common/constants/dates";
import { getAlphaColor, getColor } from "@web/common/utils/colors";
import { Text } from "@web/components/Text";
import { EditingWeekEvent } from "@web/views/Calendar/components/EditingWeekEvent";
import { WeekEvent } from "@web/views/Calendar/components/WeekEvent";
import { useToken } from "@web/common/hooks/useToken";
// import { Sidebar } from "@web/views/Calendar/components/Sidebar";

import { useGetWeekViewProps } from "./weekViewHooks/useGetWeekViewProps";
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

const dayTimes = getHourlyTimes(dayjs());

export const CalendarView = () => {
  const { token } = useToken();

  const weekViewProps = useGetWeekViewProps();
  const { component, core, eventHandlers } = weekViewProps;

  // const [isLoading, setIsLoading] = useState(true);
  const [, setResize] = useState<
    { width: number; height: number } | undefined
  >();
  const [isTodayPopoverOpen, setIsTodayPopoverOpen] = useState(false);

  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      component.setEditingEvent((editingEvent) => {
        if (editingEvent) return editingEvent;

        const handlersByKey = {
          [Key.C]: () => component.setEditingEvent({} as Schema_GridEvent),
          [Key.N]: () => component.setWeek((week) => week + 1),
          [Key.P]: () => component.setWeek((week) => week - 1),
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
    return <Redirect to={ROOT_ROUTES.LOGIN} />;
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
      >
        <StyledHeaderFlex alignItems={AlignItems.CENTER}>
          <Text colorName={ColorNames.TEAL_3} size={45}>
            {component.dayjsBasedOnWeekDay.format("MMMM")}
          </Text>

          <SpaceCharacter />

          <Text colorName={ColorNames.WHITE_2} size={45}>
            {component.dayjsBasedOnWeekDay.format("YYYY")}
          </Text>

          <StyledNavigationButtons>
            <ArrowNavigationButton
              size={40}
              colorName={ColorNames.WHITE_2}
              onClick={() => component.setWeek((actualWeek) => actualWeek - 1)}
              cursor="pointer"
            >
              {"<"}
            </ArrowNavigationButton>

            <ArrowNavigationButton
              size={40}
              colorName={ColorNames.WHITE_2}
              onClick={() => component.setWeek((actualWeek) => +actualWeek + 1)}
              cursor="pointer"
            >
              {">"}
            </ArrowNavigationButton>

            {component.today.week() !== component.week && (
              <Popover
                isOpen={isTodayPopoverOpen}
                positions={["bottom"]}
                padding={10}
                content={
                  <StyledTodayPopoverContainer>
                    <Text colorName={ColorNames.WHITE_1} size={12}>
                      {component.today.format("dddd, MMMM D")}
                    </Text>
                  </StyledTodayPopoverContainer>
                }
              >
                <TodayNavigationButton
                  onMouseEnter={() => setIsTodayPopoverOpen(true)}
                  onMouseLeave={() => setIsTodayPopoverOpen(false)}
                  cursor="pointer"
                  onClick={() => {
                    component.setWeek(component.today.week());
                    setIsTodayPopoverOpen(false);
                  }}
                  colorName={ColorNames.WHITE_2}
                  size={20}
                >
                  Today
                </TodayNavigationButton>
              </Popover>
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
              : getColor(ColorNames.WHITE_2);

            let dayNumberToDisplay = day.format("D");

            dayNumberToDisplay =
              day.format("MM") !==
                component.startOfSelectedWeekDay.format("MM") &&
              day.format("D") === "1"
                ? day.format("MMM D")
                : dayNumberToDisplay;

            if (day.isBefore(component.today)) {
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
          maxCount={component.allDayEventsMaxCount}
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
                key={event._id}
                weekViewProps={weekViewProps}
                event={event}
              />
            ))}

            {component.editingEvent && component.editingEvent.isAllDay && (
              <EditingWeekEvent
                event={component.editingEvent}
                isOpen={!!component.editingEvent.isOpen}
                onCloseEventForm={() => component.setEditingEvent(null)}
                onSubmitEventForm={eventHandlers.onSubmitEvent}
                setEvent={(event) => component.setEditingEvent(event)}
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
                  component.setEditingEvent(event as Schema_GridEvent)
                }
                isOpen={!!component.editingEvent?.isOpen}
                event={component.editingEvent}
                weekViewProps={weekViewProps}
                onCloseEventForm={() => component.setEditingEvent(null)}
                onSubmitEventForm={eventHandlers.onSubmitEvent}
              />
            )}
          </StyledEvents>
        </StyledEventsGrid>
      </StyledCalendar>
    </Styled>
  );
};
