import React, { useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Key } from "ts-keycode-enum";
import { Text } from "@web/components/Text";
import { SelectOption } from "@web/common/types/components";
import { roundByNumber } from "@web/common/utils";
import { getTimes } from "@web/common/utils/date.utils";
import { AlignItems } from "@web/components/Flex/styled";
import { TimePicker } from "@web/components/TimePicker";
import { DatePicker } from "@web/components/DatePicker";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import {
  HOURS_MINUTES_FORMAT,
  HOURS_AM_FORMAT,
  YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT,
} from "@web/common/constants/dates";
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
      label: day.format(HOURS_AM_FORMAT),
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
  isStartDatePickerShown: boolean;
  isEndDatePickerShown: boolean;
  toggleStartDatePicker: () => void;
  toggleEndDatePicker: () => void;
  setStartTime: (value: SelectOption<string>) => void;
  setEndTime: (value: SelectOption<string>) => void;
  setSelectedEndDate: (value: Date) => void;
  setSelectedStartDate: (value: Date) => void;
  startTime?: SelectOption<string>;
  endTime?: SelectOption<string>;
  selectedEndDate?: Date;
  selectedStartDate?: Date;
  showStartTimeLabel: boolean;
  setShowStartTimeLabel: React.Dispatch<React.SetStateAction<boolean>>;
}

export const DateTimePickersSection: React.FC<Props> = ({
  isStartDatePickerShown,
  isEndDatePickerShown,
  toggleStartDatePicker,
  toggleEndDatePicker,
  setStartTime,
  setEndTime,
  setSelectedEndDate,
  setSelectedStartDate,
  selectedEndDate,
  selectedStartDate,
  startTime,
  endTime,
  showStartTimeLabel = false,
  setShowStartTimeLabel,
}) => {
  const [autoFocusedTimePicker, setAutoFocusedTimePicker] = useState("");
  const [isStartTimePickerShown, toggleStartTimePicker] = useState(false);
  const [isEndTimePickerShown, toggleEndTimePicker] = useState(false);

  const startTimePickerOptions = getTimepickerFilteredOptions(
    endTime,
    "isBefore"
  );

  const endTimePickerOptions = getTimepickerFilteredOptions(
    startTime,
    "isAfter"
  );

  const closeAllTimePickers = () => {
    toggleStartTimePicker(false);
    toggleEndTimePicker(false);
  };

  const onDatePickerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    console.log("onkey");
    if (e.which !== Key.Tab) return;
    if (isStartDatePickerShown) {
      console.log("toggling");
      toggleStartDatePicker();
    }
    isEndDatePickerShown && toggleEndDatePicker();
  };

  const onEndTimePickerOpen = () => {
    setAutoFocusedTimePicker("end");
    toggleStartTimePicker(true);
    toggleEndTimePicker(true);
  };

  const onSelectEndDate = (date: Date | null | [Date | null, Date | null]) => {
    setSelectedEndDate(date as Date);
    toggleEndDatePicker();
  };

  const onSelectEndTime = (value: SelectOption<string> | null) => {
    if (!value) return;

    setEndTime(value);
    closeAllTimePickers();
  };

  const onSelectStartDate = (
    date: Date | null | [Date | null, Date | null]
  ) => {
    setSelectedStartDate(date as Date);
    toggleStartDatePicker();
  };

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
    const label = startTimeDayjs.format(HOURS_AM_FORMAT);

    setStartTime({ value, label });

    if (endTime) {
      toggleEndTimePicker(true);
    }
  };

  return (
    <StyledDateTimeFlex role="tablist" alignItems={AlignItems.CENTER}>
      <StyledDateFlex alignItems={AlignItems.CENTER}>
        {isStartDatePickerShown ? (
          <div
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <DatePicker
              autoFocus
              defaultOpen
              onCalendarClose={toggleStartDatePicker}
              onClickOutside={toggleStartDatePicker}
              onChange={() => null}
              onKeyDown={onDatePickerKeyDown}
              onSelect={onSelectStartDate}
              selected={selectedStartDate}
            />
          </div>
        ) : (
          <Text
            onFocus={() => toggleStartDatePicker}
            onClick={() => toggleStartDatePicker()}
            role="tab"
            tabIndex={0}
            withUnderline
          >
            {dayjs(selectedStartDate).format("MMM DD")}
          </Text>
        )}
      </StyledDateFlex>

      <StyledDateFlex alignItems={AlignItems.CENTER}>
        {isEndDatePickerShown ? (
          <div
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <DatePicker
              autoFocus
              defaultOpen
              onCalendarClose={toggleEndDatePicker}
              onClickOutside={toggleEndDatePicker}
              onChange={() => null}
              onKeyDown={onDatePickerKeyDown}
              onSelect={onSelectEndDate}
              selected={selectedEndDate}
            />
          </div>
        ) : (
          <Text
            role="tab"
            tabIndex={0}
            onFocus={toggleEndDatePicker}
            onClick={toggleEndDatePicker}
            withUnderline
          >
            {dayjs(selectedEndDate).format("MMM DD")}
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

        {endTime?.value && !isEndTimePickerShown && (
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
