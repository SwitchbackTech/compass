import React, { FC } from "react";
import dayjs from "dayjs";
import { Key } from "ts-key-enum";
import { darken } from "@core/util/color.utils";
import { MONTH_DAY_YEAR } from "@core/constants/date.constants";
import { DatePicker } from "@web/components/DatePicker";
import { AlignItems } from "@web/components/Flex/styled";
import {
  dateIsValid,
  shouldAdjustComplimentDate,
} from "@web/common/utils/web.date.util";

import { StyledDateFlex } from "./styled";

const stopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
  e.stopPropagation();
};

interface Props {
  bgColor: string;
  inputColor?: string;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  selectedEndDate: Date;
  selectedStartDate: Date;
  setSelectedEndDate: (value: Date) => void;
  setSelectedStartDate: (value: Date) => void;
  setIsStartDatePickerOpen: (arg0: boolean) => void;
  setIsEndDatePickerOpen: (arg0: boolean) => void;
}

export const DatePickers: FC<Props> = ({
  bgColor,
  inputColor,
  isEndDatePickerOpen,
  isStartDatePickerOpen,
  selectedEndDate,
  selectedStartDate,
  setIsEndDatePickerOpen,
  setIsStartDatePickerOpen,
  setSelectedEndDate,
  setSelectedStartDate,
}) => {
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
  const onSelectStartDate = (start: Date) => {
    setSelectedStartDate(start);
    setIsStartDatePickerOpen(false);
    adjustComplimentDateIfNeeded("start", start);
  };

  const onSelectEndDate = (end: Date) => {
    setSelectedEndDate(end);
    setIsEndDatePickerOpen(false);
    adjustComplimentDateIfNeeded("end", end);
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
              isEndDatePickerOpen && setIsEndDatePickerOpen(false);
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
              isStartDatePickerOpen && setIsStartDatePickerOpen(false);
              setIsEndDatePickerOpen(true);
            }}
            onKeyDown={(e) => onPickerKeyDown("end", e)}
            onSelect={onSelectEndDate}
            selected={selectedEndDate}
            title="Pick End Date"
            view="grid"
          />
        </div>
      </StyledDateFlex>
    </>
  );
};
