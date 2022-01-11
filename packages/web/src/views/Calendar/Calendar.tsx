import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Key } from "ts-keycode-enum";
import { Popover } from "react-tiny-popover";

import { Schema_Event } from "@core/types/event.types";

import { Text } from "@web/components/Text";
import { ColorNames } from "@web/common/types/styles";
import {
  AlignItems,
  FlexDirections,
  JustifyContent,
} from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { YEAR_MONTH_DAY_FORMAT } from "@web/common/constants/dates";
import { getAlphaColor, getColor } from "@web/common/helpers/colors";

import {
  Styled,
  StyledCalendar,
  StyledGridCol,
  StyledGridRow,
  StyledGridRows,
  StyledHeaderFlex,
  StyledEventsGrid,
  StyledGridColumns,
  StyledWeekDaysFlex,
  StyledNavigationButtons,
  StyledDayTimes,
  StyledEvents,
  TodayNavigationButton,
  ArrowNavigationButton,
  StyledWeekDayFlex,
  StyledTodayPopoverContainer,
  StyledAllDayEventsGrid,
  StyledPrevDaysOverflow,
} from "./styled";
import { useGetWeekViewProps } from "./weekViewHooks/useGetWeekViewProps";
import { GridEventEntity } from "./weekViewHooks/types";
import { WeekEvent } from "./components/WeekEvent";
import { EditingWeekEvent } from "./components/EditingWeekEvent";
import { Sidebar } from "./components/Sidebar";

export const CalendarView = () => {
  const weekViewProps = useGetWeekViewProps();
  const { component, core, eventHandlers } = weekViewProps;

  const [, setResize] = useState<
    { width: number; height: number } | undefined
  >();
  const [isTodayPopoverOpen, setIsTodayPopoverOpen] = useState(false);

  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      component.setEditingEvent((editingEvent) => {
        if (editingEvent) return editingEvent;

        const handlersByKey = {
          [Key.C]: () => component.setEditingEvent({} as GridEventEntity),
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

    const minuteHeight = core.getEventCellHeight() / 60;
    const minutes = dayjs().get("hours") * 60 + dayjs().get("minutes");
    const top = minutes * minuteHeight;

    component.eventsGridRef.current.scroll({ top, behavior: "smooth" });
  }, [component.eventsGridRef]);

  return (
    <Styled>
      <Sidebar
        onTransitionEnd={() =>
          setResize({ height: window.innerHeight, width: window.innerWidth })
        }
      />
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
                      {component.today.format("dddd, MMMM DD")}
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

            const monthDayJs = component.dayjsBasedOnWeekDay.set(
              "date",
              +day.format("DD")
            );

            let dayNumberToDisplay = day.format("D");

            dayNumberToDisplay =
              day.format("MM") !==
                component.startOfSelectedWeekDay.format("MM") &&
              day.format("D") === "1"
                ? day.format("MMM D")
                : dayNumberToDisplay;

            if (component.today.isAfter(monthDayJs)) {
              weekDayTextColor = getAlphaColor(ColorNames.WHITE_1, 0.6);
            }

            const flexBasis = core.getFlexBasisByDay(day);

            return (
              <StyledWeekDayFlex
                justifyContent={JustifyContent.CENTER}
                key={day.format(YEAR_MONTH_DAY_FORMAT)}
                alignItems={AlignItems.FLEX_END}
                id={`day-${day.format(YEAR_MONTH_DAY_FORMAT)}`}
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
                flexBasis={core.getFlexBasisByDay(day)}
                key={day.format(YEAR_MONTH_DAY_FORMAT)}
              />
            ))}
          </StyledGridColumns>

          <StyledEvents>
            {component.allDayEvents.map((event) => (
              <WeekEvent
                key={event._id}
                weekViewProps={weekViewProps}
                event={event}
              />
            ))}

            {component.editingEvent && component.editingEvent.allDay && (
              <EditingWeekEvent
                setEvent={(event) =>
                  component.setEditingEvent(event as Schema_Event)
                }
                isOpen={!!component.editingEvent?.isOpen}
                event={component.editingEvent}
                weekViewProps={weekViewProps}
                onCloseEventForm={() => component.setEditingEvent(null)}
                onSubmitEventForm={eventHandlers.onSubmitEvent}
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
            {component.dayTimes.map((time, index) => (
              <div key={`${time}-${index}`}>
                <Text size={8}>{time}</Text>
              </div>
            ))}
          </StyledDayTimes>
          <StyledGridColumns>
            <StyledPrevDaysOverflow
              widthPercent={core.getBeforeDaysOverflowWidth()}
            />

            {component.weekDays.map((day) => (
              <StyledGridCol
                flexBasis={core.getFlexBasisByDay(day)}
                key={day.format(YEAR_MONTH_DAY_FORMAT)}
              />
            ))}
          </StyledGridColumns>

          <StyledGridRows>
            {component.dayTimes.map((dayTime, index) => (
              <StyledGridRow key={`${dayTime}-${index}:component.dayTimes`} />
            ))}
          </StyledGridRows>

          <StyledEvents>
            {component.weekEvents.map((event) => (
              <WeekEvent
                key={event._id}
                weekViewProps={weekViewProps}
                event={event}
              />
            ))}

            {component.editingEvent && !component.editingEvent.allDay && (
              <EditingWeekEvent
                setEvent={(event) =>
                  component.setEditingEvent(event as Schema_Event)
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
