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
    const result = shouldAdjustComplimentTime(changed, {
      oldStart: startTime.value,
      start: changed === "start" ? value : startTime.value,
      oldEnd: endTime.value,
      end: changed === "end" ? value : endTime.value,
    });

    if (!result.shouldAdjust) {
      return {
        option: changed === "start" ? endTime : startTime,
        dayOffset: 0,
      };
    }

    const corrected =
      changed === "start"
        ? result.compliment.add(result.adjustment, "minutes")
        : result.compliment.subtract(result.adjustment, "minutes");
    const option = getTimeOptionByValue(corrected);
    const dayOffset = corrected
      .startOf("day")
      .diff(result.compliment.startOf("day"), "day");

    (changed === "start" ? setEndTime : setStartTime)(option);
    return { option, dayOffset };
  };

  // One handler for both pickers: the picked side keeps its selected date and
  // the corrected compliment reduces to (picked time ± duration), so it is
  // anchored to the picked side's date and the midnight day-carry applies to
  // the compliment. Anchoring the compliment to its own selected date instead
  // would double-count the span of a draft that already crosses midnight.
  const onTimeSelected = (
    changed: "start" | "end",
    option: SelectOption<string>,
  ) => {
    const prior = changed === "start" ? startTime : endTime;
    (changed === "start" ? setStartTime : setEndTime)(option);
    const { option: corrected, dayOffset } = adjustComplimentTimeIfNeeded(
      changed,
      option.value,
    );

    if (prior.value && prior.value !== option.value) {
      const anchorDate =
        changed === "start" ? selectedStartDate : selectedEndDate;
      const complimentDate = dayjs(anchorDate).add(dayOffset, "day").toDate();

      const schedule = mapToBackend({
        startDate: changed === "start" ? anchorDate : complimentDate,
        endDate: changed === "start" ? complimentDate : anchorDate,
        startTime: changed === "start" ? option : corrected,
        endTime: changed === "start" ? corrected : option,
        isAllDay: false,
      });

      // TS guard: isAllDay: false above always yields "timed".
      if (schedule.kind === "timed") {
        setDraft(
          replaceGridDraftSchedule(draft, {
            kind: "timed",
            start: dayjs(schedule.start).toDate(),
            end: dayjs(schedule.end).toDate(),
            timeZone: schedule.timeZone,
          }),
        );
      }
    }
    (changed === "start" ? setIsStartMenuOpen : setIsEndMenuOpen)(false);
  };

  return (
    <div className="flex items-center">
      <TimePicker
        aria-label="Start time"
        inputId="startTimePicker"
        isMenuOpen={isStartMenuOpen}
        onChange={(option) => onTimeSelected("start", option)}
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
        onChange={(option) => onTimeSelected("end", option)}
        openMenuOnFocus
        options={timeOptions}
        setIsMenuOpen={setIsEndMenuOpen}
        value={endTime}
      />
    </div>
  );
};
