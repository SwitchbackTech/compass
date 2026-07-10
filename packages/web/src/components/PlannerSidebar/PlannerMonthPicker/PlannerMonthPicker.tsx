import { type FC, useEffect, useRef, useState } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { ID_DATEPICKER_SIDEBAR } from "@web/common/constants/web.constants";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

interface Props {
  monthsShown?: number;
  onToggleSidebar?: () => void;
  onSelectDate: (date: Dayjs) => void;
  selectedDate: Dayjs;
}

const plannerMonthPickerClassName =
  "[&_.calendar]:!block [&_.calendar]:!w-full [&_.calendar]:!max-w-80 [&_.calendar]:!mx-auto [&_.calendar]:!bg-transparent [&_.calendar]:!shadow-none [&_.react-datepicker]:!border-0 [&_.react-datepicker]:!bg-transparent [&_.react-datepicker]:!shadow-none [&_.react-datepicker\\_\\_day-names]:!mb-0 [&_.react-datepicker\\_\\_header.react-datepicker\\_\\_header]:!px-0 [&_.react-datepicker\\_\\_month-container.react-datepicker\\_\\_month-container]:!bg-transparent [&_.react-datepicker\\_\\_month-container.react-datepicker\\_\\_month-container]:!px-0";

const headerActionsClassName = "!ml-2.5";

export const PlannerMonthPicker: FC<Props> = ({
  monthsShown,
  onSelectDate,
  onToggleSidebar,
  selectedDate,
}) => {
  const selectedDateKey = selectedDate.format(
    dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
  );
  const previousSelectedDateKeyRef = useRef(selectedDateKey);
  const [focusedDate, setFocusedDate] = useState(() => selectedDate);

  useEffect(() => {
    if (previousSelectedDateKeyRef.current === selectedDateKey) {
      return;
    }

    previousSelectedDateKeyRef.current = selectedDateKey;
    setFocusedDate(
      dayjs(selectedDateKey, dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
    );
  }, [selectedDateKey]);

  const getPlannerDayClassName = (date: Date) => {
    const dateKey = dayjs(date).format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

    return dateKey ===
      focusedDate.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT)
      ? "!rounded-default !font-semibold"
      : "!rounded-default !font-light";
  };

  return (
    <fieldset
      className={`c-month-picker ${plannerMonthPickerClassName}`}
      data-testid="Planner month picker"
      aria-label="Date navigation"
    >
      <DatePicker
        animationOnToggle={false}
        calendarClassName={ID_DATEPICKER_SIDEBAR}
        dayClassName={getPlannerDayClassName}
        headerActionsClassName={headerActionsClassName}
        headerEndContent={
          onToggleSidebar ? (
            <TooltipWrapper
              description="Close sidebar"
              onClick={onToggleSidebar}
              shortcut="["
            >
              <span className="flex h-6 w-6 items-center justify-center text-text-light">
                <SidebarIcon size={21} />
              </span>
            </TooltipWrapper>
          ) : null
        }
        headerClassName="!relative !justify-start !px-0 !pb-3"
        inline
        isOpen={true}
        monthContainerClassName="!w-32"
        monthTextClassName="text-[14px] font-medium"
        monthsShown={monthsShown}
        onChange={(date) => {
          if (!date) return;

          const nextDate = dayjs(date);

          setFocusedDate(nextDate);
          onSelectDate(nextDate);
        }}
        selected={focusedDate.toDate()}
        shouldCloseOnSelect={false}
        view="sidebar"
        withTodayButton={false}
      />
    </fieldset>
  );
};
