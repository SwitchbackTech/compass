import classNames from "classnames";
import type React from "react";
import * as ReactDatePickerModule from "react-datepicker";
import { type ReactDatePickerProps } from "react-datepicker";
import dayjs from "@core/util/date/dayjs";
import { darken, isDark } from "@web/common/styles/color.utils";
import { type CSSVariables } from "@web/common/styles/css.types";
import { theme } from "@web/common/styles/theme";
import { resolveDefaultExport } from "@web/common/utils/resolve-default-export.util";
import { MonthNavButton } from "@web/components/DatePicker/MonthNavButton";
import { ChevronLeftIcon } from "@web/components/Icons/ChevronLeftIcon";
import { ChevronRightIcon } from "@web/components/Icons/ChevronRightIcon";
import { Focusable, INPUT_RESET_CLASSNAME } from "../Focusable/Focusable";
import { CircleIcon } from "../Icons/CircleIcon";
import { TooltipWrapper } from "../Tooltip/TooltipWrapper";

export interface Props extends Omit<ReactDatePickerProps, "autoFocus"> {
  animationOnToggle?: boolean;
  bgColor?: string;
  headerActionsClassName?: string;
  headerClassName?: string;
  headerEndContent?: React.ReactNode;
  inputColor?: string;
  isOpen?: boolean;
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
          Component="input"
          className={classNames(
            INPUT_RESET_CLASSNAME,
            "w-28 transition-colors duration-300",
          )}
          style={{ backgroundColor: inputColor }}
          underlineColor={darken(resolvedBgColor, -15)}
          withUnderline
        />
      }
      dateFormat={"M-d-yyyy"}
      formatWeekDay={(day) => day[0]}
      open={isOpen}
      {...props}
      // Close the picker when the user clicks away (react-datepicker has no
      // onCalendarClose for outside-clicks). onCalendarOpen/onCalendarClose/
      // onSelect flow straight through {...props}.
      onClickOutside={() => {
        datePickerProps.onCalendarClose?.();
      }}
      portalId={portalId}
      showPopperArrow={false}
      renderCustomHeader={(headerProps) => {
        const { customHeaderCount, monthDate } = headerProps;
        const selectedMonth = dayjs(monthDate).format("MMM YYYY");
        const currentMonth = dayjs().format("MMM YYYY");

        return (
          <div
            className={classNames(
              "flex items-center px-2 pt-0 pb-1.25",
              headerClassName,
            )}
          >
            <div className={classNames("w-16 items-start")}>
              <span
                className={classNames("relative", monthTextClassName)}
                style={{ color: headerColor }}
              >
                {selectedMonth}
              </span>
            </div>

            {!customHeaderCount && (
              <div
                className={classNames(
                  "flex items-center",
                  headerActionsClassName,
                )}
              >
                <div className="flex items-start gap-1">
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
                </div>
                {withTodayButton && (
                  <TooltipWrapper description={currentMonth}>
                    <button
                      type="button"
                      aria-label="Go to this month"
                      className={classNames(
                        "flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-text-lighter/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                        currentMonth === selectedMonth && "invisible",
                      )}
                      style={{ color: headerColor }}
                      onClick={() => {
                        headerProps.changeMonth(dayjs().month());
                        headerProps.changeYear(dayjs().year());
                      }}
                    >
                      <CircleIcon />
                    </button>
                  </TooltipWrapper>
                )}
              </div>
            )}
            {!customHeaderCount && headerEndContent ? (
              <div className="ml-auto flex items-center">
                {headerEndContent}
              </div>
            ) : null}
          </div>
        );
      }}
    />
  );
};
