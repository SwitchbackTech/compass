import type React from "react";
import { type FC } from "react";
import dayjs from "@core/util/date/dayjs";
import { shouldAdjustComplimentDate } from "@web/common/utils/datetime/web.datetime.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { EventFormDateField } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/EventFormDateField";
import { type OnEventFormScheduleChange } from "@web/views/Forms/EventForm/types";

type PickerSide = "start" | "end";

const PICKER_SIDES: readonly PickerSide[] = ["start", "end"];

interface Props {
  displayEndDate: Date;
  draft: GridEventDraft;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  selectedEndDate: Date;
  selectedStartDate: Date;
  onScheduleChange: OnEventFormScheduleChange;
  setIsStartDatePickerOpen: (arg0: boolean) => void;
  setIsEndDatePickerOpen: (arg0: boolean) => void;
}

export const DatePickers: FC<Props> = ({
  displayEndDate,
  draft,
  isEndDatePickerOpen,
  isStartDatePickerOpen,
  selectedEndDate,
  selectedStartDate,
  onScheduleChange,
  setIsEndDatePickerOpen,
  setIsStartDatePickerOpen,
}) => {
  const toAllDayDate = (date: Date) =>
    dayjs(dayjs(date).format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT)).toDate();

  const currentAllDayBounds = () => {
    const { schedule } = draft.values;
    if (schedule.kind === "allDay") {
      return { start: schedule.start, end: schedule.end };
    }
    return { start: selectedStartDate, end: selectedEndDate };
  };

  const onSelectStartDate = (start: Date) => {
    setIsStartDatePickerOpen(false);

    const { shouldAdjust: shouldAdjustEnd, compliment } =
      shouldAdjustComplimentDate("start", {
        start,
        end: selectedEndDate,
      });

    if (shouldAdjustEnd) {
      onScheduleChange({
        kind: "allDay",
        start: toAllDayDate(start),
        end: toAllDayDate(compliment),
      });
    } else {
      onScheduleChange({
        kind: "allDay",
        start: toAllDayDate(start),
        end: currentAllDayBounds().end,
      });
    }
  };

  const onSelectEndDate = (end: Date) => {
    setIsEndDatePickerOpen(false);

    const { shouldAdjust, compliment } = shouldAdjustComplimentDate("end", {
      start: selectedStartDate,
      end,
    });

    if (shouldAdjust) {
      onScheduleChange({
        kind: "allDay",
        start: toAllDayDate(compliment),
        end: toAllDayDate(compliment),
      });
    } else {
      onScheduleChange({
        kind: "allDay",
        start: currentAllDayBounds().start,
        end: toAllDayDate(dayjs(end).add(1, "day").toDate()),
      });
    }
  };

  const pickers: Record<
    PickerSide,
    {
      isOpen: boolean;
      setIsOpen: (isOpen: boolean) => void;
      onSelect: (date: Date) => void;
      selected: Date;
      title: string;
      calendarClassName: string;
      inputId?: string;
    }
  > = {
    start: {
      isOpen: isStartDatePickerOpen,
      setIsOpen: setIsStartDatePickerOpen,
      onSelect: onSelectStartDate,
      selected: selectedStartDate,
      title: "Pick Start Date",
      calendarClassName: "startDatePicker",
      inputId: "eventFormStartDate",
    },
    end: {
      isOpen: isEndDatePickerOpen,
      setIsOpen: setIsEndDatePickerOpen,
      onSelect: onSelectEndDate,
      selected: displayEndDate,
      title: "Pick End Date",
      calendarClassName: "endDatePicker",
      inputId: "eventFormEndDate",
    },
  };

  const openOnly = (side: PickerSide) => {
    for (const other of PICKER_SIDES) {
      pickers[other].setIsOpen(other === side);
    }
  };

  const closeOpenPickers = () => {
    const open = PICKER_SIDES.filter((side) => pickers[side].isOpen);
    for (const side of open) {
      pickers[side].setIsOpen(false);
    }
    return open.length > 0;
  };

  const onPickerKeyDown = (
    side: PickerSide,
    e: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (
      e.key === "ArrowDown" &&
      !pickers[side].isOpen &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey
    ) {
      e.preventDefault();
      e.stopPropagation();
      openOnly(side);
    }

    if (e.key === "Escape" && closeOpenPickers()) {
      e.stopPropagation();
    }
  };

  return (
    <>
      {PICKER_SIDES.map((side) => (
        <EventFormDateField
          key={side}
          arrowDownOpensCalendar
          calendarClassName={pickers[side].calendarClassName}
          inputId={pickers[side].inputId}
          isOpen={pickers[side].isOpen}
          onCalendarClose={() => pickers[side].setIsOpen(false)}
          onCalendarOpen={() => openOnly(side)}
          onCommit={pickers[side].onSelect}
          onKeyDown={(event) => onPickerKeyDown(side, event)}
          selected={pickers[side].selected}
          sideLabel={side}
          title={pickers[side].title}
        />
      ))}
    </>
  );
};
