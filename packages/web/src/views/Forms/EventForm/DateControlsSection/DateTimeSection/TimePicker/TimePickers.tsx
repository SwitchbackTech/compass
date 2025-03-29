import React, { FC, useState } from "react";
import { Schema_Event } from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";
import { Option_Time } from "@web/common/types/util.types";
import { shouldAdjustComplimentTime } from "@web/common/utils/datetime/web.datetime.util";
import {
  getTimeOptionByValue,
  getTimeOptions,
  mapToBackend,
} from "@web/common/utils/web.date.util";
import { AlignItems } from "@web/components/Flex/styled";
import { StyledTimeFlex } from "../styled";
import { TimePicker } from "./TimePicker";

interface Props {
  bgColor: string;
  event: Schema_Event;
  endTime: SelectOption<string>;
  selectedEndDate: Date;
  selectedStartDate: Date;
  setEndTime: (value: SelectOption<string>) => void;
  setEvent: (event: Schema_Event) => React.SetStateAction<Schema_Event> | void;
  setStartTime: (value: SelectOption<string>) => void;
  startTime: SelectOption<string>;
}

export const TimePickers: FC<Props> = ({
  bgColor,
  endTime,
  event,
  selectedEndDate,
  selectedStartDate,
  setEndTime,
  setEvent,
  setStartTime,
  startTime,
}) => {
  const timeOptions = getTimeOptions();
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [isEndMenuOpen, setIsEndMenuOpen] = useState(false);

  const adjustComplimentTimeIfNeeded = (
    changed: "start" | "end",
    value: string,
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
      },
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

    const defaultOption = changed === "start" ? endTime : startTime;
    return defaultOption;
  };

  const onEndSelected = (option: SelectOption<string>) => {
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
    setIsEndMenuOpen(false);
  };

  const onStartSelected = (option: SelectOption<string>) => {
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
      setIsStartMenuOpen(false);
    }
  };

  return (
    <StyledTimeFlex alignItems={AlignItems.CENTER}>
      <TimePicker
        bgColor={bgColor}
        inputId="startTimePicker"
        isMenuOpen={isStartMenuOpen}
        onChange={onStartSelected}
        openMenuOnFocus
        options={timeOptions}
        setIsMenuOpen={setIsStartMenuOpen}
        value={startTime}
      />
      -
      <TimePicker
        bgColor={bgColor}
        inputId="endTimePicker"
        isMenuOpen={isEndMenuOpen}
        onChange={onEndSelected}
        openMenuOnFocus
        options={timeOptions}
        setIsMenuOpen={setIsEndMenuOpen}
        value={endTime}
      />
    </StyledTimeFlex>
  );
};
