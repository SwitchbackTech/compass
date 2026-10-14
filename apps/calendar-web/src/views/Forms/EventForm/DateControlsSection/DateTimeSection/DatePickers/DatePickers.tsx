import type React from "react";
import { type FC } from "react";
import dayjs from "@core/util/date/dayjs";
import { shouldAdjustComplimentDate } from "@web/common/utils/datetime/web.datetime.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { EventFormDateField } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/EventFormDateField";
import { type OnEventFormScheduleChange } from "@web/views/Forms/EventForm/types";

interface Props {
  displayEndDate: Date;
  draft: GridEventDraft;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  selectedEndDate: Date;
  selectedStartDate: Date;
  onScheduleChange: OnEventFormScheduleChange;
  setIsStartDatePickerOpen: (arg0: boolean) => void;
  setIsEndDatePickerOpen: (arg0: boolean) => void;
}

export const DatePickers: FC<Props> = ({
  displayEndDate,
  draft,
  isEndDatePickerOpen,
  isStartDatePickerOpen,
  selectedEndDate,
  selectedStartDate,
  onScheduleChange,
  setIsEndDatePickerOpen,
  setIsStartDatePickerOpen,
}) => {
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
    setIsStartDatePickerOpen(false);

    const { shouldAdjust: shouldAdjustEnd, compliment } =
      shouldAdjustComplimentDate("start", {
        start,
        end: selectedEndDate,
      });

    if (shouldAdjustEnd) {
      onScheduleChange({
        kind: "allDay",
        start: toAllDayDate(start),
        end: toAllDayDate(compliment),
      });
    } else {
      onScheduleChange({
        kind: "allDay",
        start: toAllDayDate(start),
        end: currentAllDayBounds().end,
      });
    }
  };

  const onSelectEndDate = (end: Date) => {
    setIsEndDatePickerOpen(false);

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

  const closeOpenPickers = () => {
    const wasOpen = isStartDatePickerOpen || isEndDatePickerOpen;
    setIsStartDatePickerOpen(false);
    setIsEndDatePickerOpen(false);
    return wasOpen;
  };

  const onPickerEscape = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && closeOpenPickers()) {
      event.stopPropagation();
    }
  };

  return (
    <>
      <EventFormDateField
        arrowDownOpensCalendar
        calendarClassName="startDatePicker"
        inputId="eventFormStartDate"
        isOpen={isStartDatePickerOpen}
        onCalendarClose={() => setIsStartDatePickerOpen(false)}
        onCalendarOpen={() => {
          setIsEndDatePickerOpen(false);
          setIsStartDatePickerOpen(true);
        }}
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
        isOpen={isEndDatePickerOpen}
        onCalendarClose={() => setIsEndDatePickerOpen(false)}
        onCalendarOpen={() => {
          setIsStartDatePickerOpen(false);
          setIsEndDatePickerOpen(true);
        }}
        onCommit={onSelectEndDate}
        onKeyDown={onPickerEscape}
        selected={displayEndDate}
        sideLabel="end"
        title="Pick End Date"
      />
    </>
  );
};
