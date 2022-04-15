import React, { useEffect, useRef, useState } from "react";
import ReactDatePicker, { ReactDatePickerProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from "dayjs";
import classNames from "classnames";
import { Text } from "@web/components/Text";
import { ColorNames } from "@web/common/types/styles";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { Flex } from "@web/components/Flex";
import { Input } from "@web/components/Input";

import {
  ChangeDayButtonsStyledFlex,
  MonthContainerStyled,
  Styled,
  StyledHeaderFlex,
  TodayStyledText,
} from "./styled";

export interface Props extends ReactDatePickerProps {
  defaultOpen?: boolean;
  onInputBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  animationOnToggle?: boolean;
  withTodayButton?: boolean;
  isShown?: boolean;
}

export interface CalendarRef extends HTMLDivElement {
  input: HTMLInputElement;
}

export const DatePicker: React.FC<Props> = ({
  defaultOpen = false,
  onSelect = () => null,
  onInputBlur,
  onCalendarClose = () => null,
  onCalendarOpen = () => null,
  autoFocus: _autoFocus = false,
  animationOnToggle = true,
  calendarClassName,
  withTodayButton = true,
  isShown: propsIsShown = false,
  shouldCloseOnSelect = true,
  ...props
}) => {
  const [_isShown, setIsShown] = useState(propsIsShown);
  const datepickerRef = useRef<CalendarRef>(null);
  const isShown = _isShown || propsIsShown;

  const _showDatePicker = (show: boolean) => {
    setTimeout(() => {
      setIsShown(show);
    });
  };

  useEffect(() => {
    if (!_autoFocus) return;

    setTimeout(() => {
      datepickerRef.current?.input.click();
      datepickerRef.current?.input.focus();
    });
  }, [_autoFocus]);

  useEffect(() => {
    _showDatePicker(defaultOpen);
  }, [defaultOpen]);

  return (
    <ReactDatePicker
      open
      shouldCloseOnSelect={shouldCloseOnSelect}
      portalId="root"
      calendarContainer={(containerProps) => (
        <Styled
          {...containerProps}
          monthsCount={(props.monthsShown || 0) + 1}
        />
      )}
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ref={datepickerRef as any}
      onSelect={(date, event: React.SyntheticEvent<Event> | undefined) => {
        onSelect(date, event);

        if (shouldCloseOnSelect) {
          setIsShown(false);
        }
      }}
      calendarClassName={classNames("calendar", calendarClassName, {
        "calendar--open": isShown,
        "calendar--animation": animationOnToggle,
      })}
      onCalendarOpen={() => {
        _showDatePicker(true);
        onCalendarOpen();
      }}
      onCalendarClose={() => {
        setIsShown(false);
        _showDatePicker(false);
        onCalendarClose();
      }}
      onClickOutside={() => {
        setIsShown(false);
        _showDatePicker(false);
        onCalendarClose();
      }}
      showPopperArrow={false}
      formatWeekDay={(day) => day[0]}
      //$$ this is causing the memory leak
      customInput={
        <Input
          onBlurCapture={onInputBlur}
          background={ColorNames.DARK_3}
          colorName={ColorNames.WHITE_1}
        />
      }
      renderCustomHeader={({
        monthDate,
        increaseMonth,
        decreaseMonth,
        changeMonth,
        changeYear,
        customHeaderCount,
      }) => {
        const formattedSelectedMonth = dayjs(monthDate).format("MMM YYYY");
        const formattedCurrentMonth = dayjs().format("MMM YYYY");

        return (
          <StyledHeaderFlex
            justifyContent={JustifyContent.LEFT}
            alignItems={AlignItems.CENTER}
          >
            <MonthContainerStyled>
              <Text colorName={ColorNames.WHITE_1} size={25}>
                {formattedSelectedMonth}
              </Text>
            </MonthContainerStyled>

            {!customHeaderCount && (
              <Flex alignItems={AlignItems.CENTER}>
                <ChangeDayButtonsStyledFlex>
                  <Text
                    cursor="pointer"
                    onClick={decreaseMonth}
                    fontWeight={600}
                    colorName={ColorNames.WHITE_1}
                    size={20}
                  >
                    {"<"}
                  </Text>
                  <Text
                    cursor="pointer"
                    onClick={increaseMonth}
                    fontWeight={600}
                    colorName={ColorNames.WHITE_1}
                    size={20}
                  >
                    {">"}
                  </Text>
                </ChangeDayButtonsStyledFlex>

                {withTodayButton &&
                  formattedCurrentMonth !== formattedSelectedMonth && (
                    <TodayStyledText
                      cursor="pointer"
                      onClick={() => {
                        changeMonth(dayjs().month());
                        changeYear(dayjs().year());
                      }}
                      colorName={ColorNames.WHITE_1}
                      size={16}
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
