import React, { FC, SetStateAction } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";
import { AlignItems } from "@web/components/Flex/styled";
import { TimePicker } from "@web/components/TimePicker";
import {
  getTimeOptionByValue,
  getTimeOptions,
  mapToBackend,
  shouldAdjustComplimentTime,
} from "@web/common/utils/web.date.util";
import { Option_Time } from "@web/common/types/util.types";

import { DatePickers } from "./DatePickers";
import { StyledDateTimeFlex, StyledTimeFlex } from "./styled";

dayjs.extend(customParseFormat);

export interface Props {
  bgColor: string;
  category: Categories_Event;
  event: Schema_Event;
  endTime: SelectOption<string>;
  inputColor?: string;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  selectedEndDate: Date;
  selectedStartDate: Date;
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

  const adjustComplimentTimeIfNeeded = (
    changed: "start" | "end",
    value: string
  ): Option_Time => {
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

    const defaultOption = changed === "start" ? startTime : endTime;
    return defaultOption;
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
        isAllDay: false,
      });

      const _event = {
        ...event,
        startDate,
        endDate,
      };

      setEvent(_event);
    }
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
        isAllDay: false,
      });

      const _event = {
        ...event,
        startDate,
        endDate,
      };

      setEvent(_event);
    }
  };

  return (
    <StyledDateTimeFlex alignItems={AlignItems.CENTER} role="tablist">
      {category === Categories_Event.ALLDAY && (
        <DatePickers
          bgColor={bgColor}
          inputColor={inputColor}
          isEndDatePickerOpen={isEndDatePickerOpen}
          isStartDatePickerOpen={isStartDatePickerOpen}
          selectedEndDate={selectedEndDate}
          selectedStartDate={selectedStartDate}
          setSelectedEndDate={setSelectedEndDate}
          setSelectedStartDate={setSelectedStartDate}
          setIsEndDatePickerOpen={setIsEndDatePickerOpen}
          setIsStartDatePickerOpen={setIsStartDatePickerOpen}
        />
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
