import dayjs from "dayjs";
import React, { FC } from "react";
import { Key } from "ts-key-enum";
import { MONTH_DAY_YEAR } from "@core/constants/date.constants";
import { darken } from "@core/util/color.utils";
import { shouldAdjustComplimentDate } from "@web/common/utils/datetime/web.datetime.util";
import { dateIsValid } from "@web/common/utils/web.date.util";
import { DatePicker } from "@web/components/DatePicker/DatePicker";
import { AlignItems } from "@web/components/Flex/styled";
import { SetEventFormField } from "../../types";
import { StyledDateFlex } from "./styled";

const stopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
  e.stopPropagation();
};

interface Props {
  bgColor: string;
  displayEndDate: Date;
  inputColor?: string;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  selectedEndDate: Date;
  selectedStartDate: Date;
  onSetEventField: SetEventFormField;
  setDisplayEndDate: (value: Date) => void;
  setSelectedEndDate: (value: Date) => void;
  setSelectedStartDate: (value: Date) => void;
  setIsStartDatePickerOpen: (arg0: boolean) => void;
  setIsEndDatePickerOpen: (arg0: boolean) => void;
}

export const DatePickers: FC<Props> = ({
  bgColor,
  displayEndDate,
  inputColor,
  isEndDatePickerOpen,
  isStartDatePickerOpen,
  selectedEndDate,
  selectedStartDate,
  onSetEventField,
  setDisplayEndDate,
  setIsEndDatePickerOpen,
  setIsStartDatePickerOpen,
  setSelectedEndDate,
  setSelectedStartDate,
}) => {
  const closeEndDatePicker = () => {
    setIsEndDatePickerOpen(false);
  };

  const closeStartDatePicker = () => {
    setIsStartDatePickerOpen(false);
  };

  const getDateFromInput = (val: string) => {
    const date = dayjs(val, MONTH_DAY_YEAR).toDate();
    return date;
  };

  const onPickerKeyDown = (
    picker: "start" | "end",
    e: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    switch (e.key) {
      case Key.Backspace: {
        e.stopPropagation();
        break;
      }
      case Key.Enter: {
        e.stopPropagation();
        e.preventDefault();

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

  const onSelectStartDate = (start: Date) => {
    setIsStartDatePickerOpen(false);
    setSelectedStartDate(start);

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
      const endDisplay = dayjs(compliment).add(1, "day").toDate();
      setDisplayEndDate(endDisplay);

      setSelectedEndDate(compliment);

      onSetEventField({
        startDate: dayjs(start).format(MONTH_DAY_YEAR),
        endDate: dayjs(compliment).format(MONTH_DAY_YEAR),
      });
    } else {
      const newStartDate = dayjs(start).format(MONTH_DAY_YEAR);
      onSetEventField({ startDate: newStartDate });
    }
  };

  const onSelectEndDate = (end: Date) => {
    setIsEndDatePickerOpen(false);

    const { shouldAdjust, compliment } = shouldAdjustComplimentDate("end", {
      start: selectedStartDate,
      end,
    });

    if (shouldAdjust) {
      setSelectedStartDate(compliment);
      setSelectedEndDate(compliment);
      setDisplayEndDate(compliment);
      onSetEventField({
        startDate: dayjs(compliment).format(MONTH_DAY_YEAR),
        endDate: dayjs(compliment).format(MONTH_DAY_YEAR),
      });
    } else {
      const newEndDate = dayjs(end).add(1, "day").format(MONTH_DAY_YEAR);
      onSetEventField({ endDate: newEndDate });
    }
  };

  return (
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
              if (isEndDatePickerOpen) {
                setIsEndDatePickerOpen(false);
              }
              setIsStartDatePickerOpen(true);
            }}
            onKeyDown={(e) => onPickerKeyDown("start", e)}
            onSelect={onSelectStartDate}
            selected={selectedStartDate}
            title="Pick Start Date"
            view="grid"
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
              if (isStartDatePickerOpen) {
                setIsStartDatePickerOpen(false);
              }
              setIsEndDatePickerOpen(true);
            }}
            onKeyDown={(e) => onPickerKeyDown("end", e)}
            onSelect={onSelectEndDate}
            selected={displayEndDate}
            title="Pick End Date"
            view="grid"
          />
        </div>
      </StyledDateFlex>
    </>
  );
};
