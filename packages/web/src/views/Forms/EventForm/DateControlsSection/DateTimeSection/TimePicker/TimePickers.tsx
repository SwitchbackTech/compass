import { type FC, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { type SelectOption } from "@web/common/types/component.types";
import { type Option_Time } from "@web/common/types/util.types";
import {
  getTimeOptionByValue,
  getTimeOptions,
  mapToBackend,
} from "@web/common/utils/datetime/web.date.util";
import { shouldAdjustComplimentTime } from "@web/common/utils/datetime/web.datetime.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { replaceGridDraftSchedule } from "@web/events/grid-event-draft.adapter";
import { TimePicker } from "./TimePicker";

interface Props {
  bgColor: string;
  draft: GridEventDraft;
  endTime: SelectOption<string>;
  selectedEndDate: Date;
  selectedStartDate: Date;
  setDraft: (draft: GridEventDraft) => void;
  setEndTime: (value: SelectOption<string>) => void;
  setStartTime: (value: SelectOption<string>) => void;
  startTime: SelectOption<string>;
}

export const TimePickers: FC<Props> = ({
  bgColor,
  draft,
  endTime,
  selectedEndDate,
  selectedStartDate,
  setDraft,
  setEndTime,
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
      const schedule = mapToBackend({
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        startTime: correctedStart ? correctedStart : startTime,
        endTime: option,
        isAllDay: false,
      });

      if (schedule.kind !== "timed") return; // TS guard: isAllDay: false above always yields "timed"

      setDraft(
        replaceGridDraftSchedule(draft, {
          kind: "timed",
          start: dayjs(schedule.start).toDate(),
          end: dayjs(schedule.end).toDate(),
          timeZone: schedule.timeZone,
        }),
      );
    }
    setIsEndMenuOpen(false);
  };

  const onStartSelected = (option: SelectOption<string>) => {
    setStartTime(option);
    const correctedEnd = adjustComplimentTimeIfNeeded("start", option.value);

    if (startTime.value && startTime.value !== option.value) {
      const schedule = mapToBackend({
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        startTime: option,
        endTime: correctedEnd ? correctedEnd : endTime,
        isAllDay: false,
      });

      if (schedule.kind !== "timed") return; // TS guard: isAllDay: false above always yields "timed"

      setDraft(
        replaceGridDraftSchedule(draft, {
          kind: "timed",
          start: dayjs(schedule.start).toDate(),
          end: dayjs(schedule.end).toDate(),
          timeZone: schedule.timeZone,
        }),
      );
      setIsStartMenuOpen(false);
    }
  };

  return (
    <div className="flex items-center">
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
    </div>
  );
};
