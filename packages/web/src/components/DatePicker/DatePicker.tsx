import classNames from "classnames";
import dayjs from "dayjs";
import React, { useEffect, useRef } from "react";
import ReactDatePicker, { ReactDatePickerProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { isDark } from "@core/util/color.utils";
import { theme } from "@web/common/styles/theme";
import { Flex } from "@web/components/Flex";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { Input } from "@web/components/Input";
import { Text } from "@web/components/Text";
import {
  ChangeDayButtonsStyledFlex,
  MonthContainerStyled,
  StyledDatePicker,
  StyledHeaderFlex,
  TodayStyledText,
} from "./styled";

export interface Props extends ReactDatePickerProps {
  animationOnToggle?: boolean;
  bgColor?: string;
  inputColor?: string;
  isOpen?: boolean;
  onInputBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  view: "sidebar" | "grid";
  withTodayButton?: boolean;
}

export interface CalendarRef extends HTMLDivElement {
  input: HTMLInputElement;
}

export const DatePicker: React.FC<Props> = ({
  animationOnToggle = true,
  autoFocus: _autoFocus = false,
  bgColor,
  calendarClassName,
  inputColor,
  isOpen = true,
  onSelect = () => null,
  onInputBlur,
  onCalendarClose = () => null,
  onCalendarOpen = () => null,
  view,
  withTodayButton = true,
  ...props
}) => {
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
      customInput={<Input bgColor={inputColor} onBlurCapture={onInputBlur} />}
      dateFormat={"M-d-yyyy"}
      formatWeekDay={(day) => day[0]}
      open={isOpen}
      onCalendarOpen={() => {
        onCalendarOpen();
      }}
      onCalendarClose={() => {
        onCalendarClose();
      }}
      onClickOutside={() => {
        onCalendarClose();
      }}
      onSelect={(date, event: React.SyntheticEvent<Event> | undefined) => {
        onSelect(date, event);
      }}
      portalId="root"
      ref={datepickerRef as any}
      showPopperArrow={false}
      renderCustomHeader={({
        monthDate,
        increaseMonth,
        decreaseMonth,
        changeMonth,
        changeYear,
        customHeaderCount,
      }) => {
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
                  <Text
                    cursor="pointer"
                    onClick={decreaseMonth}
                    color={headerColor}
                    size="l"
                  >
                    {"<"}
                  </Text>
                  <Text
                    cursor="pointer"
                    onClick={increaseMonth}
                    color={headerColor}
                    size="l"
                  >
                    {">"}
                  </Text>
                </ChangeDayButtonsStyledFlex>
                {withTodayButton && (
                  <TodayStyledText
                    isCurrentDate={currentMonth === selectedMonth}
                    cursor="pointer"
                    onClick={() => {
                      changeMonth(dayjs().month());
                      changeYear(dayjs().year());
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
      {...props}
    />
  );
};
