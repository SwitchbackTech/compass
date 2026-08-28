import { type FC, useEffect, useRef, useState } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { TrialBadge } from "@web/billing/TrialBadge";
import { ID_DATEPICKER_SIDEBAR } from "@web/common/constants/web.constants";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import { pageJumpAttrs } from "@web/shortcuts/page-jump/page-jump.targets";
import { getMonthPickerDayClassName } from "./monthPickerDayClassName";
import {
  MONTH_PICKER_NEXT_KEYCAPS,
  MONTH_PICKER_PREV_KEYCAPS,
  useMonthPickerShortcuts,
} from "./useMonthPickerShortcuts";

interface Props {
  monthsShown?: number;
  onSelectDate: (date: Dayjs) => void;
  selectedDate: Dayjs;
  viewEnd: Dayjs;
  viewStart: Dayjs;
}

const monthPickerClassName =
  "[&_.calendar]:!block [&_.calendar]:!w-full [&_.calendar]:!max-w-80 [&_.calendar]:!mx-auto [&_.calendar]:!bg-transparent [&_.calendar]:!shadow-none [&_.react-datepicker]:!border-0 [&_.react-datepicker]:!bg-transparent [&_.react-datepicker]:!shadow-none [&_.react-datepicker\\_\\_day-names]:!mb-0 [&_.react-datepicker\\_\\_header.react-datepicker\\_\\_header]:!px-0 [&_.react-datepicker\\_\\_month-container.react-datepicker\\_\\_month-container]:!bg-transparent [&_.react-datepicker\\_\\_month-container.react-datepicker\\_\\_month-container]:!px-0";

const headerActionsClassName = "!ml-2.5";

export const MonthPicker: FC<Props> = ({
  monthsShown,
  onSelectDate,
  selectedDate,
  viewEnd,
  viewStart,
}) => {
  const selectedDateKey = selectedDate.format(
    dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
  );
  const previousSelectedDateKeyRef = useRef(selectedDateKey);
  const [focusedDate, setFocusedDate] = useState(() => selectedDate);
  const [displayedMonth, setDisplayedMonth] = useState(() =>
    selectedDate.startOf("month"),
  );

  useMonthPickerShortcuts({
    onPrevMonth: () => setDisplayedMonth((month) => month.subtract(1, "month")),
    onNextMonth: () => setDisplayedMonth((month) => month.add(1, "month")),
  });

  useEffect(() => {
    if (previousSelectedDateKeyRef.current === selectedDateKey) {
      return;
    }

    previousSelectedDateKeyRef.current = selectedDateKey;
    const nextDate = dayjs(
      selectedDateKey,
      dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
    );
    setFocusedDate(nextDate);
    setDisplayedMonth(nextDate.startOf("month"));
  }, [selectedDateKey]);

  const getDayClassName = (date: Date) =>
    getMonthPickerDayClassName({
      date: dayjs(date),
      selectedDate: focusedDate,
      viewEnd,
      viewStart,
    });

  return (
    <fieldset
      className={`c-month-picker ${monthPickerClassName}`}
      data-testid="Month picker"
      aria-label="Date navigation"
      {...pageJumpAttrs("month-picker")}
    >
      <DatePicker
        animationOnToggle={false}
        calendarClassName={ID_DATEPICKER_SIDEBAR}
        calendarStartDay={
          viewStart.isSame(viewEnd, "day") ? 0 : viewStart.day()
        }
        dayClassName={getDayClassName}
        headerActionsClassName={headerActionsClassName}
        headerClassName="!relative !justify-start !px-0 !pb-3"
        headerEndContent={<TrialBadge />}
        inline
        isOpen={true}
        monthNav={{
          prevShortcut: MONTH_PICKER_PREV_KEYCAPS,
          nextShortcut: MONTH_PICKER_NEXT_KEYCAPS,
        }}
        monthTextClassName="text-[14px] font-medium"
        monthsShown={monthsShown}
        onChange={(date) => {
          if (!date) return;

          const nextDate = dayjs(date);

          setFocusedDate(nextDate);
          setDisplayedMonth(nextDate.startOf("month"));
          onSelectDate(nextDate);
        }}
        onMonthChange={(date) => {
          setDisplayedMonth(dayjs(date).startOf("month"));
        }}
        openToDate={displayedMonth.toDate()}
        selected={focusedDate.toDate()}
        shouldCloseOnSelect={false}
        view="sidebar"
        withTodayButton={true}
      />
    </fieldset>
  );
};
