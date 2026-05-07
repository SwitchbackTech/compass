import { type FC, useEffect, useRef, useState } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { ID_DATEPICKER_SIDEBAR } from "@web/common/constants/web.constants";
import { DatePicker } from "@web/components/DatePicker/DatePicker";

interface Props {
  monthsShown?: number;
  onSelectDate: (date: Dayjs) => void;
  selectedDate: Dayjs;
}

export const PlannerMonthPicker: FC<Props> = ({
  monthsShown,
  onSelectDate,
  selectedDate,
}) => {
  const selectedDateKey = selectedDate.format(
    dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
  );
  const previousSelectedDateKeyRef = useRef(selectedDateKey);
  const [focusedDate, setFocusedDate] = useState(selectedDate);

  useEffect(() => {
    if (previousSelectedDateKeyRef.current === selectedDateKey) {
      return;
    }

    previousSelectedDateKeyRef.current = selectedDateKey;
    setFocusedDate(
      dayjs(selectedDateKey, dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
    );
  }, [selectedDateKey]);

  return (
    <fieldset
      className="[&_.calendar]:!w-full [&_.calendar]:!bg-transparent [&_.calendar]:!shadow-none [&_.react-datepicker]:!border-0 [&_.react-datepicker]:!bg-transparent [&_.react-datepicker]:!shadow-none [&_.react-datepicker\\_\\_day-names]:!mb-0 [&_.react-datepicker\\_\\_day--selected]:!isolate [&_.react-datepicker\\_\\_day--selected]:!bg-transparent [&_.react-datepicker\\_\\_day--selected]:!relative [&_.react-datepicker\\_\\_day--selected]:!text-text-lighter [&_.react-datepicker\\_\\_day--selected]:before:!absolute [&_.react-datepicker\\_\\_day--selected]:before:!-inset-0.5 [&_.react-datepicker\\_\\_day--selected]:before:!-z-10 [&_.react-datepicker\\_\\_day--selected]:before:!rounded-default [&_.react-datepicker\\_\\_day--selected]:before:!bg-accent-primary [&_.react-datepicker\\_\\_day--selected]:before:!content-[''] [&_.react-datepicker\\_\\_month-container]:!overflow-visible [&_.react-datepicker\\_\\_month]:!overflow-visible [&_.react-datepicker\\_\\_week:has(.react-datepicker\\_\\_day--selected)]:!relative [&_.react-datepicker\\_\\_week:has(.react-datepicker\\_\\_day--selected)]:before:!absolute [&_.react-datepicker\\_\\_week:has(.react-datepicker\\_\\_day--selected)]:before:!-inset-x-[3px] [&_.react-datepicker\\_\\_week:has(.react-datepicker\\_\\_day--selected)]:before:!inset-y-0 [&_.react-datepicker\\_\\_week:has(.react-datepicker\\_\\_day--selected)]:before:!rounded-default [&_.react-datepicker\\_\\_week:has(.react-datepicker\\_\\_day--selected)]:before:!bg-panel-scrollbar-active/50 [&_.react-datepicker\\_\\_week:has(.react-datepicker\\_\\_day--selected)]:before:!content-[''] [&_.react-datepicker\\_\\_week:has(.react-datepicker\\_\\_day--selected)_.react-datepicker\\_\\_day]:!relative [&_.react-datepicker\\_\\_week:has(.react-datepicker\\_\\_day--selected)_.react-datepicker\\_\\_day]:!z-10 [&_.react-datepicker__header.react-datepicker__header]:!px-0 [&_.react-datepicker__month-container.react-datepicker__month-container]:!bg-transparent [&_.react-datepicker__month-container.react-datepicker__month-container]:!px-0"
      data-testid="Planner month picker"
      aria-label="Date navigation"
    >
      <DatePicker
        animationOnToggle={false}
        calendarClassName={ID_DATEPICKER_SIDEBAR}
        dayClassName={() => "!rounded-default !font-light"}
        headerActionsClassName="!absolute !inset-x-11 !justify-between [&>div:first-child]:!w-full [&>div:first-child]:!justify-between [&>span]:!hidden"
        headerClassName="!relative !justify-center !px-0 !pb-3"
        inline
        isOpen={true}
        monthContainerClassName="!w-auto"
        monthTextClassName="!text-xs"
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
        withTodayButton={true}
      />
    </fieldset>
  );
};
