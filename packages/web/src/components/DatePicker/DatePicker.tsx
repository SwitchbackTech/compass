import React, { useEffect, useRef } from "react";
import ReactDatePicker, { ReactDatePickerProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from "dayjs";
import classNames from "classnames";
import { Text } from "@web/components/Text";
import { ColorNames } from "@core/types/color.types";
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
  bgColor: string;
  defaultOpen?: boolean;
  onInputBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  isOpen?: boolean;
  animationOnToggle?: boolean;
  withTodayButton?: boolean;
}

export interface CalendarRef extends HTMLDivElement {
  input: HTMLInputElement;
}

export const DatePicker: React.FC<Props> = ({
  animationOnToggle = true,
  autoFocus: _autoFocus = false,
  bgColor,
  defaultOpen = false,
  calendarClassName,
  isOpen = true,
  onSelect = () => null,
  onInputBlur,
  onCalendarClose = () => null,
  onCalendarOpen = () => null,
  shouldCloseOnSelect = true,
  withTodayButton = true,
  ...props
}) => {
  // const [isOpen, setIsOpen] = useState(_isOpen);
  const datepickerRef = useRef<CalendarRef>(null);

  // const _showDatePicker = (show: boolean) => {
  //   setTimeout(() => {
  //     setIsOpen(show);
  //   });
  // };

  useEffect(() => {
    if (_autoFocus) {
      setTimeout(() => {
        datepickerRef.current?.input.click();
        datepickerRef.current?.input.focus();
      });
    }
  }, [_autoFocus]);

  //++
  // useEffect(() => {
  //   _showDatePicker(defaultOpen);
  // }, [defaultOpen]);

  // console.log("open?", isOpen);

  return (
    <ReactDatePicker
      calendarClassName={classNames("calendar", calendarClassName, {
        "calendar--open": isOpen,
        "calendar--animation": animationOnToggle,
      })}
      calendarContainer={(containerProps) => (
        <Styled
          {...containerProps}
          monthsCount={(props.monthsShown || 0) + 1}
        />
      )}
      customInput={
        <Input
          bgColor={bgColor}
          colorName={ColorNames.TEAL_1}
          onBlurCapture={onInputBlur}
          // background={ColorNames.GREY_3} //++
          // colorName={ColorNames.WHITE_1} //++
        />
      }
      dateFormat={"M-d-yyyy"}
      formatWeekDay={(day) => day[0]}
      open={isOpen}
      onCalendarOpen={() => {
        // _showDatePicker(true);
        onCalendarOpen();
      }}
      onCalendarClose={() => {
        // setIsOpen(false);
        // _showDatePicker(false);
        onCalendarClose();
      }}
      onClickOutside={() => {
        // console.log("clicked out");
        // setIsOpen(false);
        // _showDatePicker(false);
        onCalendarClose();
      }}
      onSelect={(date, event: React.SyntheticEvent<Event> | undefined) => {
        onSelect(date, event);
      }}
      portalId="root"
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ref={datepickerRef as any}
      // shouldCloseOnSelect={shouldCloseOnSelect} //++
      showPopperArrow={false}
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
            alignItems={AlignItems.CENTER}
            justifyContent={JustifyContent.LEFT}
          >
            <MonthContainerStyled>
              <Text colorName={ColorNames.WHITE_1} size={17}>
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
