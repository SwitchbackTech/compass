import type React from "react";
import { type FC } from "react";
import { MONTH_DAY_YEAR } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { dateIsValid } from "@web/common/utils/datetime/web.date.util";
import { shouldAdjustComplimentDate } from "@web/common/utils/datetime/web.datetime.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { type OnEventFormScheduleChange } from "@web/views/Forms/EventForm/types";

type PickerSide = "start" | "end";

const PICKER_SIDES: readonly PickerSide[] = ["start", "end"];

const stopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
  e.stopPropagation();
};

// The start and end date pickers share one row inside a narrow sidebar card.
// react-datepicker's wrapper/input-container are inline-block and size to the
// input's fixed width, so two of them overflow the card and the end date spills
// past its right edge. flex-1 + min-w-0 lets each field shrink to stay inside
// the card (max-w-28 keeps them compact on a wide sidebar); forcing the whole
// react-datepicker chain to fill the field is what lets the shrink reach the
// input instead of stopping at the inline-block wrappers.
const dateFieldClassName =
  "flex min-w-0 max-w-28 flex-1 items-center [&_.react-datepicker-wrapper]:w-full [&_.react-datepicker\\_\\_input-container]:w-full [&_input]:w-full [&_input]:min-w-0";

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
      // Given an all-day event that starts and ends on December 25,
      // the event form should show a start of "2025-12-25" and an end of "2025-12-25",
      // and the backend should store the start as "2025-12-25" and the end as "2025-12-26".
      // Adding one day to the end here helps us achieve that requirement.
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

  // One entry per side, so the key handler, the open/close rules and the mouse
  // handlers below ask "which side?" once instead of branching on it each time.
  const pickers: Record<
    PickerSide,
    {
      isOpen: boolean;
      setIsOpen: (isOpen: boolean) => void;
      onSelect: (date: Date) => void;
    }
  > = {
    start: {
      isOpen: isStartDatePickerOpen,
      setIsOpen: setIsStartDatePickerOpen,
      onSelect: onSelectStartDate,
    },
    end: {
      isOpen: isEndDatePickerOpen,
      setIsOpen: setIsEndDatePickerOpen,
      onSelect: onSelectEndDate,
    },
  };

  /** Only ever one calendar on screen: opening one side closes the other. */
  const openOnly = (side: PickerSide) => {
    for (const other of PICKER_SIDES) {
      pickers[other].setIsOpen(other === side);
    }
  };

  /** Closes whichever calendar is open; true when one was. */
  const closeOpenPickers = () => {
    const open = PICKER_SIDES.filter((side) => pickers[side].isOpen);
    for (const side of open) {
      pickers[side].setIsOpen(false);
    }
    return open.length > 0;
  };

  /** Commits text typed into the input; false when it is not a date. */
  const commitTypedDate = (side: PickerSide, value: string) => {
    if (!dateIsValid(value)) return false;
    pickers[side].onSelect(dayjs(value, MONTH_DAY_YEAR).toDate());
    return true;
  };

  const onPickerKeyDown = (
    side: PickerSide,
    e: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const typedValue = () => (e.target as HTMLInputElement).value;

    switch (true) {
      case e.key === "Backspace": {
        e.stopPropagation();
        break;
      }
      // Combobox convention: ArrowDown on the closed input opens the
      // calendar, matching what onInputClick does for the mouse.
      case e.key === "ArrowDown": {
        if (pickers[side].isOpen) break;

        e.preventDefault();
        e.stopPropagation();
        openOnly(side);
        break;
      }
      // Mod+Enter saves the form. Commit the typed date first, then let the
      // event bubble so the form-level shortcut still runs.
      case e.key === "Enter" && (e.metaKey || e.ctrlKey): {
        commitTypedDate(side, typedValue());
        break;
      }
      case e.key === "Enter": {
        e.stopPropagation();
        e.preventDefault();

        const value = typedValue();
        if (!commitTypedDate(side, value)) {
          showErrorToast(
            `Sorry, IDK what to do with a ${side} date of '${value}'. Make sure it's in '${MONTH_DAY_YEAR}' and try again`,
          );
        }
        break;
      }
      case e.key === "Escape": {
        if (closeOpenPickers()) {
          e.stopPropagation();
        }
        break;
      }
      case e.key === "Tab": {
        closeOpenPickers();
        break;
      }
      default: {
        break;
      }
    }
  };

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: This wrapper only stops date picker mouse events from bubbling to the form. */}
      <div
        className={dateFieldClassName}
        onMouseUp={stopPropagation}
        onMouseDown={stopPropagation}
      >
        <DatePicker
          calendarClassName="startDatePicker"
          isOpen={isStartDatePickerOpen}
          monthTextClassName="text-medium"
          onCalendarClose={() => setIsStartDatePickerOpen(false)}
          onCalendarOpen={() => setIsStartDatePickerOpen(true)}
          onChange={() => null}
          onInputClick={() => openOnly("start")}
          onKeyDown={(e) => onPickerKeyDown("start", e)}
          onSelect={onSelectStartDate}
          selected={selectedStartDate}
          title="Pick Start Date"
          view="grid"
        />
      </div>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: This wrapper only stops date picker mouse events from bubbling to the form. */}
      <div
        className={dateFieldClassName}
        onMouseUp={stopPropagation}
        onMouseDown={stopPropagation}
      >
        <DatePicker
          calendarClassName="endDatePicker"
          isOpen={isEndDatePickerOpen}
          monthTextClassName="text-medium"
          onCalendarClose={() => setIsEndDatePickerOpen(false)}
          onCalendarOpen={() => setIsEndDatePickerOpen(true)}
          onChange={() => null}
          onInputClick={() => openOnly("end")}
          onKeyDown={(e) => onPickerKeyDown("end", e)}
          onSelect={onSelectEndDate}
          selected={displayEndDate}
          title="Pick End Date"
          view="grid"
        />
      </div>
    </>
  );
};
