import React, { useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Key } from "ts-keycode-enum";

import { Text } from "@web/components/Text";
import { DatePicker } from "@web/components/DatePicker";
import { SelectOption } from "@web/common/types/components";
import { getTimes, roundByNumber } from "@web/common/helpers";
import { AlignItems } from "@web/components/Flex/styled";
import { TimePicker } from "@web/components/TimePicker";
import {
  HOURS_MINUTES_FORMAT,
  SHORT_HOURS_AM_FORMAT,
  YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT,
} from "@web/common/constants/dates";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { GRID_TIME_STEP } from "@web/views/Calendar/constants";

import { StyledDateFlex, StyledDateTimeFlex, StyledTimeFlex } from "./styled";

export interface RelatedTargetElement extends EventTarget {
  id?: string;
}

dayjs.extend(customParseFormat);

const getTimepickerFilteredOptions = (
  option: SelectOption<string> | undefined,
  method: "isAfter" | "isBefore"
) => {
  const options = getTimes().map((value) => {
    const day = dayjs(
      `2000-00-00 ${value}`,
      YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
    );

    return {
      value,
      label: day.format(SHORT_HOURS_AM_FORMAT),
    };
  });

  if (!option) return options;

  const collocativeMoment = dayjs(
    `2000-00-00 ${option.value}`,
    YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
  );

  return options.filter((time) => {
    const timeMoment = dayjs(
      `2000-00-00 ${time.value}`,
      YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
    );
    return (
      timeMoment[method](collocativeMoment) ||
      timeMoment.isSame(collocativeMoment)
    );
  });
};

export interface Props {
  setStartTime: (value: SelectOption<string>) => void;
  setEndTime: (value: SelectOption<string>) => void;
  setSelectedDate: (value: Date) => void;
  startTime?: SelectOption<string>;
  endTime?: SelectOption<string>;
  selectedDate?: Date;
  showStartTimeLabel: boolean;
  setShowStartTimeLabel: React.Dispatch<React.SetStateAction<boolean>>;
}

export const DateTimePickersSection: React.FC<Props> = ({
  setStartTime,
  setEndTime,
  setSelectedDate,
  selectedDate,
  startTime,
  endTime,
  showStartTimeLabel = false,
  setShowStartTimeLabel,
}) => {
  const [isStartTimePickerShown, toggleStartTimePicker] = useState(false);
  const [isEndTimePickerShown, toggleEndTimePicker] = useState(false);
  const [isDatePickerShown, toggleDatePicker] = useState(false);
  const [autoFocusedTimePicker, setAutoFocusedTimePicker] = useState("");

  const startTimePickerOptions = getTimepickerFilteredOptions(
    endTime,
    "isBefore"
  );

  const endTimePickerOptions = getTimepickerFilteredOptions(
    startTime,
    "isAfter"
  );

  const onSelectStartTime = (value: SelectOption<string> | null) => {
    if (!value) return;

    const endTimeOption = getTimepickerFilteredOptions(value, "isAfter").find(
      (option) => {
        const optionMoment = dayjs(
          `2000-00-00 ${option.value}`,
          YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
        );
        const startTimeMoment = dayjs(
          `2000-00-00 ${value.value}`,
          YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT
        );
        const startTimeMomentAdded = startTimeMoment.add(30, "minute");

        return optionMoment.isSame(startTimeMomentAdded);
      }
    );

    setEndTime(endTime || endTimeOption || value);
    setStartTime(value);
    setAutoFocusedTimePicker("end");
    toggleEndTimePicker(true);
  };

  const closeAllTimePickers = () => {
    toggleStartTimePicker(false);
    toggleEndTimePicker(false);
  };

  const onSelectEndTime = (value: SelectOption<string> | null) => {
    if (!value) return;

    setEndTime(value);
    closeAllTimePickers();
  };

  const closeDatePicker = () => {
    setTimeout(() => {
      toggleDatePicker(false);
    }, 150);
  };

  const onSelectDate = (date: Date | null | [Date | null, Date | null]) => {
    setSelectedDate(date as Date);
    closeDatePicker();
  };

  const onTimePickerBlur = (e: React.FocusEvent<HTMLElement>) => {
    const relatedTarget = e.relatedTarget as RelatedTargetElement;

    if (
      relatedTarget?.id === "endTimePicker" ||
      relatedTarget?.id === "startTimePicker"
    )
      return;
    closeAllTimePickers();
  };

  const onStartTimePickerOpen = () => {
    toggleStartTimePicker(true);
    setAutoFocusedTimePicker("start");
    setShowStartTimeLabel(true);

    if (startTime) {
      setStartTime(startTime);
      return;
    }

    const roundedUpMinutes = roundByNumber(dayjs().minute(), GRID_TIME_STEP);

    const startTimeDayjs = dayjs().set("minute", roundedUpMinutes);

    const value = startTimeDayjs.format(HOURS_MINUTES_FORMAT);
    const label = startTimeDayjs.format(SHORT_HOURS_AM_FORMAT);

    setStartTime({ value, label });

    if (endTime) {
      toggleEndTimePicker(true);
    }
  };

  const onEndTimePickerOpen = () => {
    setAutoFocusedTimePicker("end");
    toggleStartTimePicker(true);
    toggleEndTimePicker(true);
  };

  const onDatePickerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.which !== Key.Tab) return;

    closeDatePicker();
  };

  return (
    <StyledDateTimeFlex role="tablist" alignItems={AlignItems.CENTER}>
      <StyledDateFlex alignItems={AlignItems.CENTER}>
        {isDatePickerShown ? (
          <DatePicker
            defaultOpen
            autoFocus
            onCalendarClose={closeDatePicker}
            onChange={() => {}}
            onSelect={onSelectDate}
            selected={selectedDate}
            onKeyDown={onDatePickerKeyDown}
          />
        ) : (
          <Text
            role="tab"
            tabIndex={0}
            onFocus={() => toggleDatePicker(true)}
            withUnderline
          >
            {dayjs(selectedDate).format("MMM DD")}
          </Text>
        )}
      </StyledDateFlex>

      <StyledTimeFlex alignItems={AlignItems.CENTER}>
        {!isStartTimePickerShown ? (
          <Text
            role="tab"
            tabIndex={0}
            onFocus={onStartTimePickerOpen}
            withUnderline
            onClick={onStartTimePickerOpen}
          >
            {showStartTimeLabel ? startTime?.label : "Start"}
          </Text>
        ) : (
          <TimePicker
            openMenuOnFocus
            inputId="startTimePicker"
            onBlur={onTimePickerBlur}
            options={startTimePickerOptions}
            autoFocus={autoFocusedTimePicker === "start"}
            value={startTime}
            onChange={onSelectStartTime}
          />
        )}

        {isEndTimePickerShown && (
          <>
            <SpaceCharacter />-<SpaceCharacter />
            <TimePicker
              inputId="endTimePicker"
              onBlur={onTimePickerBlur}
              options={endTimePickerOptions}
              autoFocus={autoFocusedTimePicker === "end"}
              value={endTime}
              onChange={onSelectEndTime}
            />
          </>
        )}

        {endTime?.value && !isEndTimePickerShown && showStartTimeLabel && (
          <>
            <SpaceCharacter />-<SpaceCharacter />
            <Text
              role="tab"
              tabIndex={0}
              onFocus={onEndTimePickerOpen}
              withUnderline
              onClick={onEndTimePickerOpen}
            >
              {endTime.label}
            </Text>
          </>
        )}
      </StyledTimeFlex>
    </StyledDateTimeFlex>
  );
};
