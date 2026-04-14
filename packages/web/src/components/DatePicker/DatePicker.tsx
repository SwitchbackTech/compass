import classNames from "classnames";
import type React from "react";
import { useEffect, useRef } from "react";
import * as ReactDatePickerModule from "react-datepicker";
import { type ReactDatePickerProps } from "react-datepicker";
import { darken, isDark } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { MonthNavButton } from "@web/components/DatePicker/MonthNavButton";
import {
  ChangeDayButtonsStyledFlex,
  MonthContainerStyled,
  StyledDatePicker,
  StyledHeaderFlex,
  TodayStyledText,
} from "@web/components/DatePicker/styled";
import { Flex } from "@web/components/Flex";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { StyledInput } from "@web/components/Input/styled";
import { Text } from "@web/components/Text";
import { ChevronLeftIcon } from "@web/views/Day/components/Icons/ChevronLeftIcon";
import { ChevronRightIcon } from "@web/views/Day/components/Icons/ChevronRightIcon";
import { Focusable } from "../Focusable/Focusable";

export interface Props extends ReactDatePickerProps {
  animationOnToggle?: boolean;
  bgColor?: string;
  displayDate?: Date;
  inputColor?: string;
  isOpen?: boolean;
  view: "sidebar" | "grid";
  withTodayButton?: boolean;
}

export interface CalendarRef extends HTMLDivElement {
  input: HTMLInputElement;
}

const ReactDatePicker = (
  typeof ReactDatePickerModule.default === "function"
    ? ReactDatePickerModule.default
    : ReactDatePickerModule.default.default
) as React.ComponentType<ReactDatePickerProps>;

export const DatePicker: React.FC<Props> = (datePickerProps) => {
  const {
    animationOnToggle = true,
    autoFocus: _autoFocus = false,
    bgColor = theme.color.bg.primary,
    calendarClassName,
    inputColor,
    isOpen = true,
    portalId = "root",
    view,
    withTodayButton = true,
    ...props
  } = datePickerProps;
  const datepickerRef = useRef<CalendarRef>(null);
  const headerColor =
    view === "sidebar"
      ? theme.color.text.light
      : isDark(bgColor || "")
        ? theme.color.text.lighter
        : theme.color.text.dark;

  useEffect(() => {
    if (_autoFocus) {
      setTimeout(() => {
        datepickerRef.current?.input.click();
        datepickerRef.current?.input.focus();
      });
    }
  }, [_autoFocus]);

  return (
    <ReactDatePicker
      popperClassName="!z-20"
      calendarClassName={classNames("calendar", calendarClassName, {
        "calendar--open": isOpen,
        "calendar--animation": animationOnToggle,
      })}
      calendarContainer={(containerProps) => (
        <StyledDatePicker
          {...containerProps}
          bgColor={bgColor}
          selectedColor={theme.color.text.accent}
          role="combobox"
          aria-label="datepicker"
          view={view}
        />
      )}
      customInput={
        <Focusable
          Component={StyledInput}
          underlineColor={darken(bgColor, -15)}
          bgColor={inputColor}
          withUnderline
        />
      }
      dateFormat={"M-d-yyyy"}
      formatWeekDay={(day) => day[0]}
      open={isOpen}
      {...props}
      onCalendarOpen={() => {
        datePickerProps.onCalendarOpen?.();
      }}
      onCalendarClose={() => {
        datePickerProps.onCalendarClose?.();
      }}
      onClickOutside={() => {
        datePickerProps.onCalendarClose?.();
      }}
      onSelect={(date, event: React.SyntheticEvent<Event> | undefined) => {
        datePickerProps.onSelect?.(date, event);
      }}
      portalId={portalId}
      ref={(instance) => {
        datepickerRef.current = instance as unknown as CalendarRef | null;
      }}
      showPopperArrow={false}
      renderCustomHeader={(headerProps) => {
        const { customHeaderCount, monthDate } = headerProps;
        const selectedMonth = dayjs(monthDate).format("MMM YYYY");
        const currentMonth = dayjs().format("MMM YYYY");

        return (
          <StyledHeaderFlex
            alignItems={AlignItems.CENTER}
            justifyContent={JustifyContent.LEFT}
          >
            <MonthContainerStyled>
              <Text color={headerColor} size="xl">
                {selectedMonth}
              </Text>
            </MonthContainerStyled>

            {!customHeaderCount && (
              <Flex alignItems={AlignItems.CENTER}>
                <ChangeDayButtonsStyledFlex>
                  <MonthNavButton
                    ariaLabel="Previous month"
                    color={headerColor}
                    onClick={() => {
                      headerProps.decreaseMonth();
                    }}
                  >
                    <ChevronLeftIcon />
                  </MonthNavButton>
                  <MonthNavButton
                    ariaLabel="Next month"
                    color={headerColor}
                    onClick={() => {
                      headerProps.increaseMonth();
                    }}
                  >
                    <ChevronRightIcon />
                  </MonthNavButton>
                </ChangeDayButtonsStyledFlex>
                {withTodayButton && (
                  <TodayStyledText
                    isCurrentDate={currentMonth === selectedMonth}
                    cursor="pointer"
                    onClick={() => {
                      headerProps.changeMonth(dayjs().month());
                      headerProps.changeYear(dayjs().year());
                    }}
                    color={theme.color.text.light}
                    size="l"
                  >
                    Today
                  </TodayStyledText>
                )}
              </Flex>
            )}
          </StyledHeaderFlex>
        );
      }}
    />
  );
};
