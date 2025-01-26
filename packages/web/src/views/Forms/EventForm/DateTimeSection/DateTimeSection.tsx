import React, { FC, SetStateAction } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Key } from "ts-key-enum";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { MONTH_DAY_YEAR } from "@core/constants/date.constants";
import { SelectOption } from "@web/common/types/component.types";
import { AlignItems } from "@web/components/Flex/styled";
import { TimePicker } from "@web/components/TimePicker";
import { DatePicker } from "@web/components/DatePicker";
import {
  dateIsValid,
  getTimeOptionByValue,
  getTimeOptions,
  mapToBackend,
  shouldAdjustComplimentDate,
  shouldAdjustComplimentTime,
} from "@web/common/utils/web.date.util";
import { Option_Time } from "@web/common/types/util.types";
import { darken } from "@core/util/color.utils";

import { StyledDateFlex, StyledDateTimeFlex, StyledTimeFlex } from "./styled";

dayjs.extend(customParseFormat);

export interface Props {
  bgColor: string;
  category: Categories_Event;
  event: Schema_Event;
  endTime?: SelectOption<string>;
  inputColor?: string;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  selectedEndDate?: Date;
  selectedStartDate?: Date;
  setEndTime: (value: SelectOption<string>) => void;
  setIsEndDatePickerOpen: (arg0: boolean) => void;
  setIsStartDatePickerOpen: (arg0: boolean) => void;
  setSelectedEndDate: (value: Date) => void;
  setSelectedStartDate: (value: Date) => void;
  setStartTime: (value: SelectOption<string>) => void;
  setEvent: (event: Schema_Event) => SetStateAction<Schema_Event | void>;
  startTime: SelectOption<string>;
}

export const DateTimeSection: FC<Props> = ({
  bgColor,
  category,
  event,
  inputColor,
  isEndDatePickerOpen,
  isStartDatePickerOpen,
  selectedEndDate,
  selectedStartDate,
  setIsStartDatePickerOpen,
  setIsEndDatePickerOpen,
  setStartTime,
  setEndTime,
  setSelectedEndDate,
  setSelectedStartDate,
  setEvent,
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
  ): Option_Time | undefined => {
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
        return correctedEnd;
      }

      if (changed === "end") {
        const _correctedStart = compliment.subtract(adjustment, "minutes");
        const correctedStart = getTimeOptionByValue(_correctedStart);
        setStartTime(correctedStart);
        return correctedStart;
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
    const correctedStart = adjustComplimentTimeIfNeeded("end", option.value);

    if (endTime.value && endTime.value !== option.value) {
      const { startDate, endDate } = mapToBackend({
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        startTime: correctedStart ? correctedStart : startTime,
        endTime: option,
        isAllDay: event.isAllDay,
      });

      const _event = {
        ...event,
        startDate,
        endDate,
      };

      setEvent(_event);
    }
  };

  const onSelectStartDate = (start: Date) => {
    setSelectedStartDate(start);
    setIsStartDatePickerOpen(false);
    adjustComplimentDateIfNeeded("start", start);
  };

  const onSelectStartTime = (option: SelectOption<string>) => {
    setStartTime(option);
    const correctedEnd = adjustComplimentTimeIfNeeded("start", option.value);

    if (startTime.value && startTime.value !== option.value) {
      const { startDate, endDate } = mapToBackend({
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        startTime: option,
        endTime: correctedEnd ? correctedEnd : endTime,
        isAllDay: event.isAllDay,
      });

      const _event = {
        ...event,
        startDate,
        endDate,
      };

      setEvent(_event);
    }
  };

  const stopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <StyledDateTimeFlex alignItems={AlignItems.CENTER} role="tablist">
      {category === Categories_Event.ALLDAY && (
        <>
          <StyledDateFlex alignItems={AlignItems.CENTER}>
            <div onMouseUp={stopPropagation} onMouseDown={stopPropagation}>
              <DatePicker
                bgColor={darken(bgColor, 15)}
                calendarClassName="startDatePicker"
                inputColor={inputColor}
                isOpen={isStartDatePickerOpen}
                onCalendarClose={closeStartDatePicker}
                onCalendarOpen={() => {
                  setIsStartDatePickerOpen(true);
                }}
                onChange={() => null}
                onInputClick={() => {
                  isEndDatePickerOpen && setIsEndDatePickerOpen(false);
                  setIsStartDatePickerOpen(true);
                }}
                onKeyDown={(e) => onPickerKeyDown("start", e)}
                onSelect={onSelectStartDate}
                selected={selectedStartDate}
                title="Pick Start Date"
                view="picker"
              />
            </div>
          </StyledDateFlex>

          <StyledDateFlex alignItems={AlignItems.CENTER}>
            <div onMouseUp={stopPropagation} onMouseDown={stopPropagation}>
              <DatePicker
                bgColor={darken(bgColor, 15)}
                calendarClassName="endDatePicker"
                inputColor={inputColor}
                isOpen={isEndDatePickerOpen}
                onCalendarClose={closeEndDatePicker}
                onCalendarOpen={() => setIsEndDatePickerOpen(true)}
                onChange={() => null}
                onInputClick={() => {
                  isStartDatePickerOpen && setIsStartDatePickerOpen(false);
                  setIsEndDatePickerOpen(true);
                }}
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
