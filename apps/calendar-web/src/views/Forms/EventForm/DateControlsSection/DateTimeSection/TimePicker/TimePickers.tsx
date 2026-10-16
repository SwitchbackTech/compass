import { type FC, useId, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { type SelectOption } from "@web/common/types/component.types";
import { type TimeOption } from "@web/common/types/util.types";
import {
  getTimeOptionByValue,
  getTimeOptions,
  tryMapToBackend,
} from "@web/common/utils/datetime/web.date.util";
import { shouldAdjustComplimentTime } from "@web/common/utils/datetime/web.datetime.util";
import { EventFormDateField } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/EventFormDateField";
import { timedScheduleFromDateChange } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/eventFormDateField.util";
import { useOpenDatePickerSide } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/useOpenDatePickerSide";
import { type OnEventFormScheduleChange } from "@web/views/Forms/EventForm/types";
import { TimePicker } from "./TimePicker";

export const END_TIME_ORDER_ERROR = "End time must be after start time";

const timeOptions = getTimeOptions();

interface Props {
  endTime: SelectOption<string>;
  onScheduleChange: OnEventFormScheduleChange;
  scheduleEnd: Date;
  scheduleStart: Date;
  selectedEndDate: Date;
  selectedStartDate: Date;
  startTime: SelectOption<string>;
}

export const TimePickers: FC<Props> = ({
  endTime,
  onScheduleChange,
  scheduleEnd,
  scheduleStart,
  selectedEndDate,
  selectedStartDate,
  startTime,
}) => {
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [isEndMenuOpen, setIsEndMenuOpen] = useState(false);
  const datePickers = useOpenDatePickerSide();
  const [timeError, setTimeError] = useState<string | null>(null);
  const timeErrorId = useId();

  const spansMultipleDays = !dayjs(selectedStartDate).isSame(
    selectedEndDate,
    "day",
  );

  const adjustComplimentTimeIfNeeded = (
    changed: "start" | "end",
    value: string,
  ): { option: TimeOption; dayOffset: number } => {
    const result = shouldAdjustComplimentTime(changed, {
      oldStart: startTime.value,
      start: changed === "start" ? value : startTime.value,
      oldEnd: endTime.value,
      end: changed === "end" ? value : endTime.value,
    });

    if (!result.shouldAdjust) {
      return {
        option: changed === "start" ? endTime : startTime,
        dayOffset: 0,
      };
    }

    const corrected =
      changed === "start"
        ? result.compliment.add(result.adjustment, "minutes")
        : result.compliment.subtract(result.adjustment, "minutes");
    const option = getTimeOptionByValue(corrected);
    const dayOffset = corrected
      .startOf("day")
      .diff(result.compliment.startOf("day"), "day");

    return { option, dayOffset };
  };

  const closeMenu = (changed: "start" | "end") => {
    (changed === "start" ? setIsStartMenuOpen : setIsEndMenuOpen)(false);
  };

  const rejectTimeSelection = (changed: "start" | "end") => {
    setTimeError(END_TIME_ORDER_ERROR);
    closeMenu(changed);
  };

  const commitTimedSchedule = (mapped: ReturnType<typeof tryMapToBackend>) => {
    if (!mapped.ok) {
      setTimeError(END_TIME_ORDER_ERROR);
      return false;
    }
    setTimeError(null);
    if (mapped.schedule.kind === "timed") {
      onScheduleChange({
        kind: "timed",
        start: dayjs(mapped.schedule.start).toDate(),
        end: dayjs(mapped.schedule.end).toDate(),
        timeZone: mapped.schedule.timeZone,
      });
    }
    return true;
  };

  const onDateSelected = (changed: "start" | "end", nextDate: Date) => {
    datePickers.close(changed);
    const mapped = timedScheduleFromDateChange({
      changed,
      nextDate,
      selectedStartDate,
      startTime,
      endTime,
      scheduleStart,
      scheduleEnd,
    });
    commitTimedSchedule(mapped);
  };

  const onTimeSelected = (
    changed: "start" | "end",
    option: SelectOption<string>,
  ) => {
    const prior = changed === "start" ? startTime : endTime;
    if (!prior.value || prior.value === option.value) {
      setTimeError(null);
      closeMenu(changed);
      return;
    }

    const { option: corrected, dayOffset } = adjustComplimentTimeIfNeeded(
      changed,
      option.value,
    );

    const anchorDate =
      changed === "start" ? selectedStartDate : selectedEndDate;
    const complimentDate = dayjs(anchorDate).add(dayOffset, "day").toDate();

    const mapped = tryMapToBackend({
      startDate: changed === "start" ? anchorDate : complimentDate,
      endDate: changed === "start" ? complimentDate : anchorDate,
      startTime: changed === "start" ? option : corrected,
      endTime: changed === "start" ? corrected : option,
      isAllDay: false,
    });

    if (!mapped.ok) {
      rejectTimeSelection(changed);
      return;
    }

    commitTimedSchedule(mapped);
    closeMenu(changed);
  };

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <EventFormDateField
          calendarClassName="timedStartDatePicker"
          inputId="eventFormStartDate"
          isOpen={datePickers.openSide === "start"}
          onCalendarClose={() => datePickers.close("start")}
          onCalendarOpen={() => datePickers.open("start")}
          onCommit={(date) => onDateSelected("start", date)}
          selected={selectedStartDate}
          sideLabel="start"
          title="Pick Start Date"
        />
        <TimePicker
          aria-label="Start time"
          complementaryTime={endTime.value}
          inputId="startTimePicker"
          isMenuOpen={isStartMenuOpen}
          onChange={(option) => onTimeSelected("start", option)}
          openMenuOnFocus
          options={timeOptions}
          pickerRole="start"
          setIsMenuOpen={setIsStartMenuOpen}
          value={startTime}
        />
        <span className="text-text-muted">-</span>
        {spansMultipleDays ? (
          <EventFormDateField
            calendarClassName="timedEndDatePicker"
            inputId="eventFormEndDate"
            isOpen={datePickers.openSide === "end"}
            onCalendarClose={() => datePickers.close("end")}
            onCalendarOpen={() => datePickers.open("end")}
            onCommit={(date) => onDateSelected("end", date)}
            selected={selectedEndDate}
            sideLabel="end"
            title="Pick End Date"
          />
        ) : null}
        <TimePicker
          aria-describedby={timeError ? timeErrorId : undefined}
          aria-invalid={timeError ? true : undefined}
          aria-label="End time"
          complementaryTime={startTime.value}
          inputId="endTimePicker"
          isMenuOpen={isEndMenuOpen}
          onChange={(option) => onTimeSelected("end", option)}
          openMenuOnFocus
          options={timeOptions}
          pickerRole="end"
          setIsMenuOpen={setIsEndMenuOpen}
          value={endTime}
        />
      </div>
      {timeError ? (
        <p className="text-error text-xs" id={timeErrorId} role="alert">
          {timeError}
        </p>
      ) : null}
    </div>
  );
};
