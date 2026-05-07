import { type FC } from "react";
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
  return (
    <fieldset
      className="[&_.calendar]:!w-full [&_.calendar]:!bg-transparent [&_.calendar]:!shadow-none [&_.react-datepicker]:!border-0 [&_.react-datepicker]:!bg-transparent [&_.react-datepicker]:!shadow-none [&_.react-datepicker\\_\\_day-names]:!mb-0 [&_.react-datepicker__header.react-datepicker__header]:!px-0 [&_.react-datepicker__month-container.react-datepicker__month-container]:!bg-transparent [&_.react-datepicker__month-container.react-datepicker__month-container]:!px-0"
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

          onSelectDate(dayjs(date));
        }}
        selected={selectedDate.toDate()}
        shouldCloseOnSelect={false}
        view="sidebar"
        withTodayButton={true}
      />
    </fieldset>
  );
};
