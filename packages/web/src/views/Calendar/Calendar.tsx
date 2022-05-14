import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Key } from "ts-keycode-enum";
import { ColorNames } from "@web/common/types/styles";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { YEAR_MONTH_DAY_FORMAT } from "@web/common/constants/dates";
import { getAlphaColor, getColor } from "@web/common/utils/colors";
import { useToken } from "@web/common/hooks/useToken";
import { getCurrentMinute } from "@web/common/utils/grid.util";
import { getWeekDayLabel } from "@web/ducks/events/event.utils";
import {
  AlignItems,
  FlexDirections,
  JustifyContent,
} from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { TodayButtonPopover } from "@web/views/Calendar/components/TodayButtonPopover";
import { Sidebar } from "@web/views/Calendar/components/Sidebar";
import { DragLayer } from "@web/views/Calendar/containers/DragLayer";
import {
  useGetWeekViewProps,
  WeekViewProps,
} from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { AllDayRow } from "@web/views/Calendar/components/Grid/AllDayRow/AllDayRow";

import {
  ArrowNavigationButton,
  Styled,
  StyledAllDayEventsGrid,
  StyledCalendar,
  StyledGridCol,
  StyledHeaderFlex,
  StyledGridColumns,
  StyledNavigationButtons,
  StyledWeekDayFlex,
  StyledWeekDaysFlex,
} from "./styled";
import { MainGrid } from "./components/Grid/MainGrid";
import { WEEK_DAYS_HEIGHT } from "./calendar.constants";

export interface Props {
  weekViewProps: WeekViewProps;
}

export const CalendarView = () => {
  const { token } = useToken();

  const weekViewProps = useGetWeekViewProps();
  const { component, core, eventHandlers } = weekViewProps;

  const [, setResize] = useState<
    { width: number; height: number } | undefined
  >();

  /**********************
   * Keys & Shortcuts Init
   **********************/
  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      eventHandlers.setEditingEvent((editingEvent) => {
        if (editingEvent) return editingEvent;

        const handlersByKey = {
          [Key.C]: () =>
            eventHandlers.setEditingEvent({
              isAllDay: true,
              isOpen: true,
            } as Schema_GridEvent),
          [Key.T]: () => eventHandlers.setWeek(component.today.week()),
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
      setTimeout(() => {
        eventHandlers.onEventsGridRelease(e as unknown as React.MouseEvent);
      });
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
    const top = getCurrentMinute() * minuteHeight;

    component.eventsGridRef.current.scroll({ top, behavior: "smooth" });
  }, [component.calendarRef]);

  /**********
   * Render
   **********/

  if (!token) {
    return <Navigate to={ROOT_ROUTES.LOGIN} />;
  }

  return (
    <Styled>
      <DragLayer weekViewProps={weekViewProps} />
      <Sidebar
        onTransitionEnd={() =>
          setResize({ height: window.innerHeight, width: window.innerWidth })
        }
        weekViewProps={weekViewProps}
      />
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
              cursor="pointer"
              colorName={ColorNames.DARK_5}
              onClick={() =>
                eventHandlers.setWeek((actualWeek) => actualWeek - 1)
              }
              role="navigation"
              size={40}
              title="previous week"
            >
              {"<"}
            </ArrowNavigationButton>

            <ArrowNavigationButton
              colorName={ColorNames.DARK_5}
              cursor="pointer"
              onClick={() =>
                eventHandlers.setWeek((actualWeek) => +actualWeek + 1)
              }
              role="navigation"
              size={40}
              title="next week"
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
                title={getWeekDayLabel(day)}
                color={weekDayTextColor}
                flexBasis={flexBasis}
              >
                <Text lineHeight={WEEK_DAYS_HEIGHT} size={WEEK_DAYS_HEIGHT}>
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

          <AllDayRow weekViewProps={weekViewProps} />
        </StyledAllDayEventsGrid>
        <MainGrid weekViewProps={weekViewProps} />
      </StyledCalendar>
    </Styled>
  );
};
