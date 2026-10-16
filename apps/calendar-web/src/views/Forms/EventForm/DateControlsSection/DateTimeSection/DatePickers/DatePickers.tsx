import type React from "react";
import { type FC } from "react";
import dayjs from "@core/util/date/dayjs";
import { shouldAdjustComplimentDate } from "@web/common/utils/datetime/web.datetime.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { EventFormDateField } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/EventFormDateField";
import { type OpenDatePickerSide } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/useOpenDatePickerSide";
import { type OnEventFormScheduleChange } from "@web/views/Forms/EventForm/types";

interface Props {
  datePickers: OpenDatePickerSide;
  displayEndDate: Date;
  draft: GridEventDraft;
  selectedEndDate: Date;
  selectedStartDate: Date;
  onScheduleChange: OnEventFormScheduleChange;
}

export const DatePickers: FC<Props> = ({
  datePickers,
  displayEndDate,
  draft,
  selectedEndDate,
  selectedStartDate,
  onScheduleChange,
}) => {
  const { openSide, open, close, closeAll } = datePickers;

  const toAllDayDate = (date: Date) =>
    dayjs(dayjs(date).format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT)).toDate();

  const currentAllDayBounds = () => {
    const { schedule } = draft.values;
    if (schedule.kind === "allDay") {
      return { start: schedule.start, end: schedule.end };
    }
    return { start: selectedStartDate, end: selectedEndDate };
  };

  const onSelectStartDate = (start: Date) => {
    close("start");

    const { shouldAdjust: shouldAdjustEnd, compliment } =
      shouldAdjustComplimentDate("start", {
        start,
        end: selectedEndDate,
      });

    onScheduleChange({
      kind: "allDay",
      start: toAllDayDate(start),
      end: shouldAdjustEnd
        ? toAllDayDate(compliment)
        : currentAllDayBounds().end,
    });
  };

  const onSelectEndDate = (end: Date) => {
    close("end");

    const { shouldAdjust, compliment } = shouldAdjustComplimentDate("end", {
      start: selectedStartDate,
      end,
    });

    if (shouldAdjust) {
      onScheduleChange({
        kind: "allDay",
        start: toAllDayDate(compliment),
        end: toAllDayDate(compliment),
      });
    } else {
      onScheduleChange({
        kind: "allDay",
        start: currentAllDayBounds().start,
        end: toAllDayDate(dayjs(end).add(1, "day").toDate()),
      });
    }
  };

  const onPickerEscape = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && closeAll()) {
      event.stopPropagation();
    }
  };

  return (
    <>
      <EventFormDateField
        arrowDownOpensCalendar
        calendarClassName="startDatePicker"
        inputId="eventFormStartDate"
        isOpen={openSide === "start"}
        onCalendarClose={() => close("start")}
        onCalendarOpen={() => open("start")}
        onCommit={onSelectStartDate}
        onKeyDown={onPickerEscape}
        selected={selectedStartDate}
        sideLabel="start"
        title="Pick Start Date"
      />
      <EventFormDateField
        arrowDownOpensCalendar
        calendarClassName="endDatePicker"
        inputId="eventFormEndDate"
        isOpen={openSide === "end"}
        onCalendarClose={() => close("end")}
        onCalendarOpen={() => open("end")}
        onCommit={onSelectEndDate}
        onKeyDown={onPickerEscape}
        selected={displayEndDate}
        sideLabel="end"
        title="Pick End Date"
      />
    </>
  );
};
