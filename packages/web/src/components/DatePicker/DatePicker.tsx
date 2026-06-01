import classNames from "classnames";
import type React from "react";
import * as ReactDatePickerModule from "react-datepicker";
import { type ReactDatePickerProps } from "react-datepicker";
import { darken, isDark } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { resolveDefaultExport } from "@web/common/utils/resolve-default-export.util";
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

export interface Props extends Omit<ReactDatePickerProps, "autoFocus"> {
  animationOnToggle?: boolean;
  bgColor?: string;
  headerActionsClassName?: string;
  headerClassName?: string;
  headerEndContent?: React.ReactNode;
  inputColor?: string;
  isOpen?: boolean;
  monthContainerClassName?: string;
  monthTextClassName?: string;
  view: "sidebar" | "grid";
  withTodayButton?: boolean;
}

type ReactDatePickerComponent = typeof ReactDatePickerModule.default;

const ReactDatePicker = resolveDefaultExport<ReactDatePickerComponent>(
  ReactDatePickerModule.default,
);

export const DatePicker: React.FC<Props> = (datePickerProps) => {
  const {
    animationOnToggle = true,
    bgColor = theme.color.bg.primary,
    calendarClassName,
    headerActionsClassName,
    headerClassName,
    headerEndContent,
    inputColor,
    isOpen = true,
    monthContainerClassName,
    monthTextClassName,
    portalId = "root",
    view,
    withTodayButton = true,
    ...props
  } = datePickerProps;
  const headerColor =
    view === "sidebar"
      ? theme.color.text.light
      : isDark(bgColor || "")
        ? theme.color.text.lighter
        : theme.color.text.dark;

  return (
    <ReactDatePicker
      popperClassName="!z-22"
      calendarClassName={classNames("calendar", calendarClassName, {
        "calendar--open": isOpen,
        "calendar--animation": animationOnToggle,
      })}
      calendarContainer={(containerProps) => (
        <StyledDatePicker
          {...containerProps}
          bgColor={bgColor}
          selectedColor={theme.color.text.accent}
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
      showPopperArrow={false}
      renderCustomHeader={(headerProps) => {
        const { customHeaderCount, monthDate } = headerProps;
        const selectedMonth = dayjs(monthDate).format(
          view === "sidebar" ? "MMMM YYYY" : "MMM YYYY",
        );
        const currentMonth = dayjs().format("MMM YYYY");

        return (
          <StyledHeaderFlex
            alignItems={AlignItems.CENTER}
            className={headerClassName}
            justifyContent={JustifyContent.LEFT}
          >
            <MonthContainerStyled className={monthContainerClassName}>
              <Text
                className={monthTextClassName}
                color={headerColor}
                size="xl"
              >
                {selectedMonth}
              </Text>
            </MonthContainerStyled>

            {!customHeaderCount && (
              <Flex
                alignItems={AlignItems.CENTER}
                className={headerActionsClassName}
              >
                <ChangeDayButtonsStyledFlex>
                  <MonthNavButton
                    ariaLabel="Previous month"
                    color={headerColor}
                    isSidebarStyle={view === "sidebar"}
                    onClick={() => {
                      headerProps.decreaseMonth();
                    }}
                  >
                    <ChevronLeftIcon />
                  </MonthNavButton>
                  <MonthNavButton
                    ariaLabel="Next month"
                    color={headerColor}
                    isSidebarStyle={view === "sidebar"}
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
            {!customHeaderCount && headerEndContent ? (
              <div className="ml-auto flex items-center">
                {headerEndContent}
              </div>
            ) : null}
          </StyledHeaderFlex>
        );
      }}
    />
  );
};
