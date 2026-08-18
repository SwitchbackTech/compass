import { type FC, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { type SelectOption } from "@web/common/types/component.types";
import { type TimeOption } from "@web/common/types/util.types";
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

  // shouldAdjustComplimentTime does its math on a fixed calendar-day anchor, so
  // a correction that crosses midnight lands on an adjacent day. Formatting it
  // back to a bare "h:mm A" drops that day, and pairing the wrapped time with an
  // unchanged date produced an inverted schedule that made mapToBackend throw an
  // unhandled ZodError. Return the day delta so the caller can shift the date
  // with it.
  const adjustComplimentTimeIfNeeded = (
    changed: "start" | "end",
    value: string,
  ): { option: TimeOption; dayOffset: number } => {
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
      const corrected =
        changed === "start"
          ? compliment.add(adjustment, "minutes")
          : compliment.subtract(adjustment, "minutes");
      const option = getTimeOptionByValue(corrected);
      const dayOffset = corrected
        .startOf("day")
        .diff(compliment.startOf("day"), "day");

      if (changed === "start") {
        setEndTime(option);
      } else {
        setStartTime(option);
      }

      return { option, dayOffset };
    }

    return { option: changed === "start" ? endTime : startTime, dayOffset: 0 };
  };

  const onEndSelected = (option: SelectOption<string>) => {
    setEndTime(option);
    const { option: correctedStart, dayOffset } = adjustComplimentTimeIfNeeded(
      "end",
      option.value,
    );

    if (endTime.value && endTime.value !== option.value) {
      // A start correction that wrapped backwards past midnight belongs on the
      // previous calendar day.
      const startDate = dayjs(selectedStartDate).add(dayOffset, "day").toDate();

      const schedule = mapToBackend({
        startDate,
        endDate: selectedEndDate,
        startTime: correctedStart,
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
    const { option: correctedEnd, dayOffset } = adjustComplimentTimeIfNeeded(
      "start",
      option.value,
    );

    if (startTime.value && startTime.value !== option.value) {
      // An end correction that wrapped forwards past midnight belongs on the
      // next calendar day.
      const endDate = dayjs(selectedEndDate).add(dayOffset, "day").toDate();

      const schedule = mapToBackend({
        startDate: selectedStartDate,
        endDate,
        startTime: option,
        endTime: correctedEnd,
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
        aria-label="Start time"
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
        aria-label="End time"
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
