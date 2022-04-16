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
  MONTH_DAY_COMPACT_FORMAT,
} from "@web/common/constants/dates";
import { GRID_TIME_STEP } from "@web/views/Calendar/constants";

import { StyledDateFlex, StyledDateTimeFlex, StyledTimeFlex } from "./styled";

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
export interface RelatedTargetElement extends EventTarget {
  id?: string;
}
export interface Props {
  endTime?: SelectOption<string>;
  isAllDay: boolean;
  isEndDatePickerShown: boolean;
  isStartDatePickerShown: boolean;
  selectedEndDate?: Date;
  selectedStartDate?: Date;
  setEndTime: (value: SelectOption<string>) => void;
  setIsEndDatePickerOpen: (boolean) => void;
  setIsStartDatePickerOpen: (boolean) => void;
  setSelectedEndDate: (value: Date) => void;
  setSelectedStartDate: (value: Date) => void;
  setStartTime: (value: SelectOption<string>) => void;
  startTime?: SelectOption<string>;
}

export const DateTimeSection: React.FC<Props> = ({
  isAllDay,
  isEndDatePickerShown,
  isStartDatePickerShown,
  setIsStartDatePickerOpen: toggleStartDatePicker,
  setIsEndDatePickerOpen: toggleEndDatePicker,
  setStartTime,
  setEndTime,
  setSelectedEndDate,
  setSelectedStartDate,
  selectedEndDate,
  selectedStartDate,
  startTime,
  endTime,
}) => {
  const [autoFocusedTimePicker, setAutoFocusedTimePicker] = useState("");
  const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);

  const startTimePickerOptions = getTimepickerFilteredOptions(
    endTime,
    "isBefore"
  );

  const endTimePickerOptions = getTimepickerFilteredOptions(
    startTime,
    "isAfter"
  );

  const closeEndDatePicker = () => {
    toggleEndDatePicker(false);
  };

  const closeStartDatePicker = () => {
    toggleEndDatePicker(false);
  };

  const openEndDatePicker = () => {
    toggleEndDatePicker(true);
  };

  const openStartDatePicker = () => {
    toggleStartDatePicker(true);
  };

  const closeAllTimePickers = () => {
    setIsStartTimePickerOpen(false);
    setIsEndTimePickerOpen(false);
  };

  const onEndDatePickerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.which !== Key.Tab) return;

    isStartDatePickerShown && toggleStartDatePicker(false);

    if (isEndDatePickerShown) {
      console.log("closing end");
      closeEndDatePicker();
    } else {
      console.log("opening end");
      openEndDatePicker();
    }
  };

  const onStartDatePickerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.which !== Key.Tab) return;

    isEndDatePickerShown && toggleEndDatePicker(false);

    if (isStartDatePickerShown) {
      console.log("closing start & opening end");
      toggleStartDatePicker(false);
      toggleEndDatePicker(true);
    } else {
      console.log("opening start");
      toggleStartDatePicker(true);
    }
  };

  const onEndTimePickerOpen = () => {
    setIsStartTimePickerOpen(true);
    console.log(autoFocusedTimePicker);
    setIsEndTimePickerOpen(true);
    setAutoFocusedTimePicker("end");
    console.log(autoFocusedTimePicker);
  };

  const onSelectEndDate = (date: Date | null | [Date | null, Date | null]) => {
    setSelectedEndDate(date as Date);
    toggleEndDatePicker(true);
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
    toggleStartDatePicker(false);
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
    setIsEndTimePickerOpen(true);
  };

  const onStartTimePickerOpen = () => {
    console.log("opening start time picker");
    setIsStartTimePickerOpen(true);
    setAutoFocusedTimePicker("start");

    if (startTime) {
      setStartTime(startTime);
      console.log("closing after setting start time");
      setIsEndTimePickerOpen(true);
      return;
    }

    const roundedUpMinutes = roundByNumber(dayjs().minute(), GRID_TIME_STEP);
    const startTimeDayjs = dayjs().set("minute", roundedUpMinutes);
    const value = startTimeDayjs.format(HOURS_MINUTES_FORMAT);
    const label = startTimeDayjs.format(HOURS_AM_FORMAT);

    setStartTime({ value, label });

    if (endTime) {
      setIsEndTimePickerOpen(true);
    }
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
              onCalendarClose={closeStartDatePicker}
              onClickOutside={closeStartDatePicker}
              onChange={() => null}
              onKeyDown={onStartDatePickerKeyDown}
              onSelect={onSelectStartDate}
              selected={selectedStartDate}
            />
          </div>
        ) : (
          <Text
            onClick={openStartDatePicker}
            onFocus={() => isStartDatePickerShown && openStartDatePicker()}
            onKeyDown={onStartDatePickerKeyDown}
            role="tab"
            tabIndex={0}
            withUnderline
          >
            {dayjs(selectedStartDate).format(MONTH_DAY_COMPACT_FORMAT)}
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
              onCalendarClose={closeEndDatePicker}
              onClickOutside={closeEndDatePicker}
              onChange={() => null}
              onKeyDown={onEndDatePickerKeyDown}
              onSelect={onSelectEndDate}
              selected={selectedEndDate}
            />
          </div>
        ) : (
          <Text
            role="tab"
            tabIndex={0}
            onFocus={() => isEndDatePickerShown && openEndDatePicker}
            onClick={openEndDatePicker}
            withUnderline
          >
            {dayjs(selectedEndDate).format(MONTH_DAY_COMPACT_FORMAT)}
          </Text>
        )}
      </StyledDateFlex>

      {!isAllDay && (
        <StyledTimeFlex alignItems={AlignItems.CENTER}>
          {isStartTimePickerOpen ? (
            <TimePicker
              openMenuOnFocus
              inputId="startTimePicker"
              onBlur={onTimePickerBlur}
              options={startTimePickerOptions}
              autoFocus={autoFocusedTimePicker === "start"}
              value={startTime}
              onChange={onSelectStartTime}
            />
          ) : (
            <Text
              role="tab"
              tabIndex={0}
              onClick={onStartTimePickerOpen}
              onFocus={onStartTimePickerOpen}
              withUnderline
            >
              {startTime?.label}
            </Text>
          )}

          {isEndTimePickerOpen && (
            <>
              <SpaceCharacter />-<SpaceCharacter />
              <TimePicker
                autoFocus={autoFocusedTimePicker === "end"}
                inputId="endTimePicker"
                onBlur={onTimePickerBlur}
                onChange={onSelectEndTime}
                options={endTimePickerOptions}
                value={endTime}
              />
            </>
          )}

          {endTime?.value && !isEndTimePickerOpen && (
            <>
              <SpaceCharacter />-<SpaceCharacter />
              <Text
                onFocus={onEndTimePickerOpen}
                onClick={onEndTimePickerOpen}
                role="tab"
                tabIndex={0}
                withUnderline
              >
                {endTime.label}
              </Text>
            </>
          )}
        </StyledTimeFlex>
      )}
    </StyledDateTimeFlex>
  );
};
