import React, { FC } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Key } from "ts-key-enum";
import { SelectOption } from "@web/common/types/components";
import { AlignItems } from "@web/components/Flex/styled";
import { TimePicker } from "@web/components/TimePicker";
import { DatePicker } from "@web/components/DatePicker";
import { MONTH_DAY_YEAR } from "@web/common/constants/date.constants";
import {
  dateIsValid,
  getTimeOptionByValue,
  getTimeOptions,
  shouldAdjustComplimentTime,
} from "@web/common/utils/web.date.util";

import { StyledDateFlex, StyledDateTimeFlex, StyledTimeFlex } from "./styled";

dayjs.extend(customParseFormat);

export interface Props {
  endTime?: SelectOption<string>;
  isAllDay: boolean;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  bgColor?: string;
  selectedEndDate?: Date;
  selectedStartDate?: Date;
  setEndTime: (value: SelectOption<string>) => void;
  setIsEndDatePickerOpen: (arg0: boolean) => void;
  setIsStartDatePickerOpen: (arg0: boolean) => void;
  setSelectedEndDate: (value: Date) => void;
  setSelectedStartDate: (value: Date) => void;
  setStartTime: (value: SelectOption<string>) => void;
  startTime: SelectOption<string>;
}

export const DateTimeSection: FC<Props> = ({
  isAllDay,
  isEndDatePickerOpen,
  isStartDatePickerOpen,
  bgColor,
  selectedEndDate,
  selectedStartDate,
  setIsStartDatePickerOpen,
  setIsEndDatePickerOpen,
  setStartTime,
  setEndTime,
  setSelectedEndDate,
  setSelectedStartDate,
  startTime,
  endTime,
}) => {
  const timeOptions = getTimeOptions();

  const adjustComplimentIfNeeded = (
    changed: "start" | "end",
    value: string
  ) => {
    const start = changed === "start" ? value : startTime.value;
    const end = changed === "end" ? value : endTime.value;

    const { shouldAdjust, adjustment, compliment } = shouldAdjustComplimentTime(
      changed,
      {
        oldStart: startTime.value,
        start,
        oldEnd: endTime.value,
        end,
      }
    );

    if (shouldAdjust) {
      if (changed === "start") {
        const _correctedEnd = compliment.add(adjustment, "minutes");
        const correctedEnd = getTimeOptionByValue(_correctedEnd);
        setEndTime(correctedEnd);
        return;
      }

      if (changed === "end") {
        const _correctedStart = compliment.subtract(adjustment, "minutes");
        const correctedStart = getTimeOptionByValue(_correctedStart);
        setStartTime(correctedStart);
      }
    }
  };

  const getDateFromInput = (val: string) => {
    const date = dayjs(val, MONTH_DAY_YEAR).toDate();
    return date;
  };

  const closeEndDatePicker = () => {
    setIsEndDatePickerOpen(false);
  };

  const closeStartDatePicker = () => {
    setIsStartDatePickerOpen(false);
  };

  const onPickerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case Key.Backspace: {
        e.stopPropagation();
        break;
      }
      case Key.Enter: {
        e.stopPropagation();
        const input = e.target as HTMLInputElement;
        const val = input.value;

        const isFinalDate = val !== undefined;
        if (!dateIsValid(val) && isFinalDate) {
          alert(`Sorry, IDK what to do with '${val}'
          Make sure it's in '${MONTH_DAY_YEAR}' and try again`);
          return;
        }

        const start = getDateFromInput(val);
        onSelectStartDate(start);
        break;
      }
      case Key.Escape: {
        if (isStartDatePickerOpen) {
          e.stopPropagation();
          closeStartDatePicker();
        }
        break;
      }
      case Key.Tab: {
        if (isStartDatePickerOpen) {
          console.log("closing cuz tab"); //++
          setIsStartDatePickerOpen(false);
        }
        break;
      }
      default: {
        return;
      }
    }
  };

  const onSelectEndDate = (date: Date | null | [Date | null, Date | null]) => {
    setSelectedEndDate(date as Date);
    setIsEndDatePickerOpen(false);
  };

  const onSelectEndTime = (option: SelectOption<string>) => {
    setEndTime(option);
    adjustComplimentIfNeeded("end", option.value);
  };

  // date: Date | null | [Date | null, Date | null]
  const onSelectStartDate = (date: Date) => {
    const start = date;
    console.log("start:", start);
    setSelectedStartDate(start);
    setIsStartDatePickerOpen(false);
  };

  const onSelectStartTime = (option: SelectOption<string>) => {
    setStartTime(option);
    adjustComplimentIfNeeded("start", option.value);
  };

  return (
    <StyledDateTimeFlex alignItems={AlignItems.CENTER} role="tablist">
      <StyledDateFlex alignItems={AlignItems.CENTER}>
        <div
          onFocus={() => {
            if (!isStartDatePickerOpen) {
              setIsStartDatePickerOpen(true);
            }
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <DatePicker
            bgColor={bgColor}
            calendarClassName="startDatePicker"
            isOpen={isStartDatePickerOpen}
            onCalendarClose={() => {
              closeStartDatePicker;
            }}
            onCalendarOpen={() => {
              setIsStartDatePickerOpen(true);
            }}
            onClickOutside={() => {
              closeStartDatePicker;
            }}
            onChange={() => null}
            onInputClick={() => {
              setIsStartDatePickerOpen(true);
            }}
            onKeyDown={onPickerKeyDown}
            onSelect={onSelectStartDate}
            selected={selectedStartDate}
            title="Pick Start Date"
          />
        </div>
      </StyledDateFlex>

      {isAllDay && (
        <StyledDateFlex alignItems={AlignItems.CENTER}>
          <div
            onFocus={() => {
              if (!isEndDatePickerOpen) {
                setIsEndDatePickerOpen(true);
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <DatePicker
              bgColor={bgColor}
              calendarClassName="endDatePicker"
              isOpen={isEndDatePickerOpen}
              onCalendarClose={() => {
                closeEndDatePicker;
              }}
              onClickOutside={() => {
                closeEndDatePicker();
              }}
              onChange={() => null}
              onSelect={onSelectEndDate}
              selected={selectedEndDate}
              title="Pick End Date"
            />
          </div>
        </StyledDateFlex>
      )}

      {!isAllDay && (
        <StyledTimeFlex alignItems={AlignItems.CENTER}>
          <TimePicker
            bgColor={bgColor}
            value={startTime}
            inputId="startTimePicker"
            onChange={onSelectStartTime}
            openMenuOnFocus={true}
            options={timeOptions}
          />
          -
          <TimePicker
            bgColor={bgColor}
            value={endTime}
            inputId="endTimePicker"
            onChange={onSelectEndTime}
            openMenuOnFocus
            options={timeOptions}
          />
        </StyledTimeFlex>
      )}
    </StyledDateTimeFlex>
  );
};

/*

  const onStartTimePickerOpen = () => {
    setIsStartTimePickerOpen(true);
    setAutoFocusedTimePicker("start");

    if (startTime) {
      setStartTime(startTime);
      setIsEndTimePickerOpen(true);
      return;
    }

    const roundedUpMinutes = roundToNext(dayjs().minute(), GRID_TIME_STEP);
    const _start = dayjs().set("minute", roundedUpMinutes);
    const value = _start.format(HOURS_MINUTES_FORMAT);
    const label = _start.format(HOURS_AM_FORMAT);

    setStartTime({ value, label });

    if (endTime) {
      setIsEndTimePickerOpen(true);
    }
  };
*/
/*
  const findOption = () => {
    const endOption = timeOptions.find((_option) => {
      const option = dayjs(`2000-00-00 ${_option.value}`, YMDHAM_FORMAT);
      const start = dayjs(`2000-00-00 ${startTime.value}`, YMDHAM_FORMAT);
      const startTimeAdded = start.add(30, "minute");

      return option.isSame(startTimeAdded);
    });
  };
  */
