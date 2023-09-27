import React, { FC } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Key } from "ts-key-enum";
import { Categories_Event } from "@core/types/event.types";
import { MONTH_DAY_YEAR } from "@core/constants/date.constants";
import { SelectOption } from "@web/common/types/component.types";
import { AlignItems } from "@web/components/Flex/styled";
import { TimePicker } from "@web/components/TimePicker";
import { DatePicker } from "@web/components/DatePicker";
import {
  dateIsValid,
  getTimeOptionByValue,
  getTimeOptions,
  shouldAdjustComplimentDate,
  shouldAdjustComplimentTime,
} from "@web/common/utils/web.date.util";

import { StyledDateFlex, StyledDateTimeFlex, StyledTimeFlex } from "./styled";

dayjs.extend(customParseFormat);

export interface Props {
  category: Categories_Event;
  endTime?: SelectOption<string>;
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
  category,
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

  const adjustComplimentDateIfNeeded = (
    changed: "start" | "end",
    value: Date
  ) => {
    const start = changed === "start" ? value : selectedStartDate;
    const end = changed === "end" ? value : selectedEndDate;

    const { shouldAdjust, compliment } = shouldAdjustComplimentDate(changed, {
      start,
      end,
    });

    if (shouldAdjust) {
      if (changed === "start") {
        setSelectedEndDate(compliment);
        return;
      }

      if (changed === "end") {
        setSelectedStartDate(compliment);
      }
    }
  };

  const adjustComplimentTimeIfNeeded = (
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

  const openEndDatePicker = () => {
    if (isStartDatePickerOpen) {
      setIsStartDatePickerOpen(false);
    }
    if (!isEndDatePickerOpen) {
      setIsEndDatePickerOpen(true);
    }
  };

  const openStartDatePicker = () => {
    if (isEndDatePickerOpen) {
      setIsEndDatePickerOpen(false);
    }
    if (!isStartDatePickerOpen) {
      setIsStartDatePickerOpen(true);
    }
  };

  const onPickerKeyDown = (
    picker: "start" | "end",
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    switch (e.key) {
      case Key.Backspace: {
        e.stopPropagation();
        break;
      }
      case Key.Enter: {
        e.stopPropagation();
        const input = e.target as HTMLInputElement;
        const val = input.value;
        const isInvalid = val !== undefined && !dateIsValid(val);

        if (isInvalid) {
          alert(`Sorry, IDK what to do with a ${picker} date of '${val}'
          Make sure it's in '${MONTH_DAY_YEAR}' and try again`);
          return;
        }

        const date = getDateFromInput(val);

        if (picker === "start") {
          onSelectStartDate(date);
        }

        if (picker === "end") {
          onSelectEndDate(date);
        }

        break;
      }
      case Key.Escape: {
        if (isStartDatePickerOpen) {
          e.stopPropagation();
          closeStartDatePicker();
        }
        if (isEndDatePickerOpen) {
          e.stopPropagation();
          closeEndDatePicker();
        }
        break;
      }
      case Key.Tab: {
        if (isStartDatePickerOpen) {
          setIsStartDatePickerOpen(false);
        }
        if (isEndDatePickerOpen) {
          setIsEndDatePickerOpen(false);
        }
        break;
      }
      default: {
        return;
      }
    }
  };

  const onSelectEndDate = (end: Date) => {
    setSelectedEndDate(end);
    setIsEndDatePickerOpen(false);
    adjustComplimentDateIfNeeded("end", end);
  };

  const onSelectEndTime = (option: SelectOption<string>) => {
    setEndTime(option);
    adjustComplimentTimeIfNeeded("end", option.value);
  };

  const onSelectStartDate = (start: Date) => {
    setSelectedStartDate(start);
    setIsStartDatePickerOpen(false);
    adjustComplimentDateIfNeeded("start", start);
  };

  const onSelectStartTime = (option: SelectOption<string>) => {
    setStartTime(option);
    adjustComplimentTimeIfNeeded("start", option.value);
  };

  const stopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <StyledDateTimeFlex alignItems={AlignItems.CENTER} role="tablist">
      {category === Categories_Event.ALLDAY && (
        <>
          <StyledDateFlex alignItems={AlignItems.CENTER}>
            <div
              onFocus={openStartDatePicker}
              onMouseUp={stopPropagation}
              onMouseDown={stopPropagation}
            >
              <DatePicker
                bgColor={bgColor}
                calendarClassName="startDatePicker"
                isOpen={isStartDatePickerOpen}
                onCalendarClose={closeStartDatePicker}
                onCalendarOpen={() => {
                  setIsStartDatePickerOpen(true);
                }}
                onChange={() => null}
                onInputClick={() => setIsStartDatePickerOpen(true)}
                onKeyDown={(e) => onPickerKeyDown("start", e)}
                onSelect={onSelectStartDate}
                selected={selectedStartDate}
                title="Pick Start Date"
                view="picker"
              />
            </div>
          </StyledDateFlex>

          <StyledDateFlex alignItems={AlignItems.CENTER}>
            <div
              onFocus={openEndDatePicker}
              onMouseUp={stopPropagation}
              onMouseDown={stopPropagation}
            >
              <DatePicker
                bgColor={bgColor}
                calendarClassName="endDatePicker"
                isOpen={isEndDatePickerOpen}
                onCalendarClose={closeEndDatePicker}
                onCalendarOpen={() => setIsEndDatePickerOpen(true)}
                onChange={() => null}
                onInputClick={() => setIsEndDatePickerOpen(true)}
                onKeyDown={(e) => onPickerKeyDown("end", e)}
                onSelect={onSelectEndDate}
                selected={selectedEndDate}
                title="Pick End Date"
                view="picker"
              />
            </div>
          </StyledDateFlex>
        </>
      )}

      {category === Categories_Event.TIMED && (
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
