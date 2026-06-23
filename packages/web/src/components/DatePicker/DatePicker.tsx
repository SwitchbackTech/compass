import classNames from "classnames";
import type React from "react";
import * as ReactDatePickerModule from "react-datepicker";
import { type ReactDatePickerProps } from "react-datepicker";
import { darken, isDark } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";
import { type CSSVariables } from "@web/common/styles/css.types";
import { theme } from "@web/common/styles/theme";
import { resolveDefaultExport } from "@web/common/utils/resolve-default-export.util";
import { MonthNavButton } from "@web/components/DatePicker/MonthNavButton";
import { AlignItems, Flex, JustifyContent } from "@web/components/Flex/Flex";
import { InputBase } from "@web/components/Input/Input";
import { Text } from "@web/components/Text/Text";
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
    bgColor,
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
  const resolvedBgColor = bgColor ?? theme.color.bg.primary;
  const datePickerStyle: CSSVariables = {
    "--date-picker-bg": bgColor ?? "var(--compass-color-bg-primary)",
  };
  const isDarkBackground = isDark(resolvedBgColor);
  const headerColor =
    view === "sidebar"
      ? "var(--compass-color-text-light)"
      : isDarkBackground
        ? "var(--compass-color-text-lighter)"
        : "var(--compass-color-text-dark)";

  return (
    <ReactDatePicker
      popperClassName="!z-22"
      calendarClassName={classNames("calendar", calendarClassName, {
        "calendar--open": isOpen,
        "calendar--animation": animationOnToggle,
      })}
      calendarContainer={({ children, className }) => (
        <div
          className={classNames("c-date-picker", className)}
          data-dark={isDarkBackground}
          data-view={view}
          style={datePickerStyle}
        >
          {children}
        </div>
      )}
      customInput={
        <Focusable
          Component={InputBase}
          className="w-28"
          underlineColor={darken(resolvedBgColor, -15)}
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
          <Flex
            alignItems={AlignItems.CENTER}
            className={classNames("px-2 pt-0 pb-1.25", headerClassName)}
            justifyContent={JustifyContent.LEFT}
          >
            <Flex className={classNames("w-24.25", monthContainerClassName)}>
              <Text className={monthTextClassName} color={headerColor}>
                {selectedMonth}
              </Text>
            </Flex>

            {!customHeaderCount && (
              <Flex
                alignItems={AlignItems.CENTER}
                className={headerActionsClassName}
              >
                <Flex className="gap-1">
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
                </Flex>
                {withTodayButton && (
                  <Text
                    className={classNames(
                      "mr-10 px-1.5 hover:brightness-160 hover:transition-[filter] hover:duration-350 hover:ease-out",
                      currentMonth === selectedMonth && "opacity-0",
                    )}
                    cursor="pointer"
                    onClick={() => {
                      headerProps.changeMonth(dayjs().month());
                      headerProps.changeYear(dayjs().year());
                    }}
                    color="var(--compass-color-text-light)"
                    size="l"
                  >
                    Today
                  </Text>
                )}
              </Flex>
            )}
            {!customHeaderCount && headerEndContent ? (
              <div className="ml-auto flex items-center">
                {headerEndContent}
              </div>
            ) : null}
          </Flex>
        );
      }}
    />
  );
};
