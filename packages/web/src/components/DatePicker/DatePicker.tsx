import React, { useEffect, useRef } from "react";
import ReactDatePicker, { ReactDatePickerProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from "dayjs";
import classNames from "classnames";
import { Text } from "@web/components/Text";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { Flex } from "@web/components/Flex";
import { Input } from "@web/components/Input";
import { theme } from "@web/common/styles/theme";

import {
  ChangeDayButtonsStyledFlex,
  MonthContainerStyled,
  StyledDatePicker,
  StyledHeaderFlex,
  TodayStyledText,
} from "./styled";

export interface Props extends ReactDatePickerProps {
  animationOnToggle?: boolean;
  bgColor: string;
  isOpen?: boolean;
  onInputBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  view: "widget" | "picker";
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
          selectedColor={bgColor}
          view={view}
        />
      )}
      customInput={<Input bgColor={bgColor} onBlurCapture={onInputBlur} />}
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
              <Text color={theme.color.text.light} size="xl">
                {selectedMonth}
              </Text>
            </MonthContainerStyled>

            {!customHeaderCount && (
              <Flex alignItems={AlignItems.CENTER}>
                <ChangeDayButtonsStyledFlex>
                  <Text
                    cursor="pointer"
                    onClick={decreaseMonth}
                    color={theme.color.text.light}
                    size="l"
                  >
                    {"<"}
                  </Text>
                  <Text
                    cursor="pointer"
                    onClick={increaseMonth}
                    color={theme.color.text.light}
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
