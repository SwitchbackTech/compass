import React, { useEffect, useRef, useState } from 'react';
import ReactDatePicker, { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import dayjs from 'dayjs';
import classNames from 'classnames';

import { Text } from '@components/Text';
import { ColorNames } from '@common/types/styles';
import { AlignItems, JustifyContent } from '@components/Flex/styled';
import { Flex } from '@components/Flex';
import { Input } from '@components/Input';

import {
  ChangeDayButtonsStyledFlex,
  Styled,
  StyledHeaderFlex,
  TodayStyledText,
} from './styled';

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
  onSelect = () => {},
  onInputBlur,
  onCalendarClose = () => {},
  onCalendarOpen = () => {},
  autoFocus: _autoFocus = false,
  animationOnToggle = true,
  calendarClassName,
  withTodayButton = true,
  isShown: propsIsShown = false,
  shouldCloseOnSelect = true,
  ...props
}) => {
  const [_isShown, toggleIsShown] = useState(propsIsShown);
  const datepickerRef = useRef<CalendarRef>(null);
  const isShown = _isShown || propsIsShown;

  const toggleDatePicker = (show: boolean) => {
    setTimeout(() => {
      toggleIsShown(show);
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
    toggleDatePicker(defaultOpen);
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
          toggleIsShown(false);
        }
      }}
      calendarClassName={classNames('calendar', calendarClassName, {
        'calendar--open': isShown,
        'calendar--animation': animationOnToggle,
      })}
      onCalendarOpen={() => {
        toggleDatePicker(true);
        onCalendarOpen();
      }}
      onCalendarClose={() => {
        toggleDatePicker(false);
        onCalendarClose();
      }}
      showPopperArrow={false}
      formatWeekDay={(day) => day[0]}
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
        const formattedSelectedMonth = dayjs(monthDate).format('MMM YYYY');
        const formattedCurrentMonth = dayjs().format('MMM YYYY');

        return (
          <StyledHeaderFlex
            justifyContent={JustifyContent.SPACE_BETWEEN}
            alignItems={AlignItems.CENTER}
          >
            <Text colorName={ColorNames.WHITE_1} size={25}>
              {formattedSelectedMonth}
            </Text>

            {!customHeaderCount && (
              <Flex alignItems={AlignItems.CENTER}>
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

                <ChangeDayButtonsStyledFlex>
                  <Text
                    cursor="pointer"
                    onClick={decreaseMonth}
                    fontWeight={600}
                    colorName={ColorNames.WHITE_1}
                    size={20}
                  >
                    {'<'}
                  </Text>
                  <Text
                    cursor="pointer"
                    onClick={increaseMonth}
                    fontWeight={600}
                    colorName={ColorNames.WHITE_1}
                    size={20}
                  >
                    {'>'}
                  </Text>
                </ChangeDayButtonsStyledFlex>
              </Flex>
            )}
          </StyledHeaderFlex>
        );
      }}
      {...props}
    />
  );
};
