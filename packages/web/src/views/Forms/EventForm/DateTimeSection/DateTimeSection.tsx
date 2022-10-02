import React, { FC, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Key } from "ts-keycode-enum";
import { Text } from "@web/components/Text";
import { SelectOption } from "@web/common/types/components";
import { roundToNext } from "@web/common/utils";
import { AlignItems } from "@web/components/Flex/styled";
import { TimePicker } from "@web/components/TimePicker";
import { DatePicker } from "@web/components/DatePicker";
import {
  HOURS_MINUTES_FORMAT,
  HOURS_AM_FORMAT,
  MONTH_DAY_COMPACT_FORMAT,
} from "@web/common/constants/date.constants";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";
import {
  getTimeOptionByValue,
  getTimeOptions,
  shouldAdjustComplimentTime,
} from "@web/common/utils/web.date.util";

import { StyledDateFlex, StyledDateTimeFlex, StyledTimeFlex } from "./styled";

dayjs.extend(customParseFormat);

//++
interface RelatedTargetElement extends EventTarget {
  id?: string;
}
export interface Props {
  endTime?: SelectOption<string>;
  isAllDay: boolean;
  isEndDatePickerShown: boolean;
  isStartDatePickerShown: boolean;
  pickerBgColor?: string;
  selectedEndDate?: Date;
  selectedStartDate?: Date;
  setEndTime: (value: SelectOption<string>) => void;
  setIsEndDatePickerOpen: (arg0: boolean) => void;
  setIsStartDatePickerOpen: (arg0: boolean) => void;
  setSelectedEndDate: (value: Date) => void;
  setSelectedStartDate: (value: Date) => void;
  setStartTime: (value: SelectOption<string>) => void;
  startTime: SelectOption<string>;
}

export const DateTimeSection: FC<Props> = ({
  isAllDay,
  isEndDatePickerShown,
  isStartDatePickerShown,
  pickerBgColor,
  selectedEndDate,
  selectedStartDate,
  setIsStartDatePickerOpen: toggleStartDatePicker,
  setIsEndDatePickerOpen: toggleEndDatePicker,
  setStartTime,
  setEndTime,
  setSelectedEndDate,
  setSelectedStartDate,
  startTime,
  endTime,
}) => {
  const [autoFocusedTimePicker, setAutoFocusedTimePicker] = useState<
    "start" | "end" | ""
  >("");

  if (!startTime) return;
  const timeOptions = getTimeOptions();

  const adjustComplimentIfNeeded = (
    changed: "start" | "end",
    value: string
  ) => {
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
        console.log("corrected end:", correctedEnd);
        setEndTime(correctedEnd);
        return;
      }

      if (changed === "end") {
        const _correctedStart = compliment.subtract(adjustment, "minutes");
        const correctedStart = getTimeOptionByValue(_correctedStart);
        console.log(`corrected start (-${adjustment}):`, correctedStart.value);
        setStartTime(correctedStart);
      }
    }
  };

  const closeEndDatePicker = () => {
    toggleEndDatePicker(false);
  };

  const closeStartDatePicker = () => {
    toggleEndDatePicker(false);
  };

  const openEndDatePicker = () => {
    toggleEndDatePicker(true);
  };

  const openStartDatePicker = () => {
    toggleStartDatePicker(true);
  };

  //++
  // const closeAllTimePickers = () => {
  //   setIsStartTimePickerOpen(false);
  //   setIsEndTimePickerOpen(false);
  // };

  const onEndDatePickerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.which !== Key.Tab) return;

    isStartDatePickerShown && toggleStartDatePicker(false);

    if (isEndDatePickerShown) {
      closeEndDatePicker();
    } else {
      openEndDatePicker();
    }
  };

  const onStartDatePickerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.which !== Key.Tab) return;

    isEndDatePickerShown && toggleEndDatePicker(false);

    if (isStartDatePickerShown) {
      toggleStartDatePicker(false);
      toggleEndDatePicker(true);
    } else {
      toggleStartDatePicker(true);
    }
  };

  //++
  // const onEndTimePickerOpen = () => {
  //   setIsStartTimePickerOpen(true);
  //   setIsEndTimePickerOpen(true);
  //   setAutoFocusedTimePicker("end");
  // };

  const onSelectEndDate = (date: Date | null | [Date | null, Date | null]) => {
    setSelectedEndDate(date as Date);
    toggleEndDatePicker(false);
  };

  const onSelectEndTime = (option: SelectOption<string>) => {
    setEndTime(option);
    adjustComplimentIfNeeded("end", option.value);
  };

  const onSelectStartDate = (
    date: Date | null | [Date | null, Date | null]
  ) => {
    setSelectedStartDate(date as Date);
    toggleStartDatePicker(false);
  };

  const onSelectStartTime = (option: SelectOption<string>) => {
    setStartTime(option);
    adjustComplimentIfNeeded("start", option.value);

    // setAutoFocusedTimePicker("end"); //++
    // setIsEndTimePickerOpen(true);
  };

  const onStartTimePickerOpen = () => {
    setIsStartTimePickerOpen(true);
    setAutoFocusedTimePicker("start");

    if (startTime) {
      setStartTime(startTime);
      setIsEndTimePickerOpen(true);
      return;
    }

    const roundedUpMinutes = roundToNext(dayjs().minute(), GRID_TIME_STEP);
    const _start = dayjs().set("minute", roundedUpMinutes);
    const value = _start.format(HOURS_MINUTES_FORMAT);
    const label = _start.format(HOURS_AM_FORMAT);

    setStartTime({ value, label });

    if (endTime) {
      setIsEndTimePickerOpen(true);
    }
  };

  return (
    <StyledDateTimeFlex role="tablist" alignItems={AlignItems.CENTER}>
      <StyledDateFlex alignItems={AlignItems.CENTER}>
        {isStartDatePickerShown ? (
          <div
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <DatePicker
              autoFocus
              defaultOpen
              onCalendarClose={closeStartDatePicker}
              onClickOutside={closeStartDatePicker}
              onChange={() => null}
              onKeyDown={onStartDatePickerKeyDown}
              onSelect={onSelectStartDate}
              selected={selectedStartDate}
            />
          </div>
        ) : (
          <Text
            onClick={openStartDatePicker}
            onFocus={() => isStartDatePickerShown && openStartDatePicker()}
            onKeyDown={onStartDatePickerKeyDown}
            role="tab"
            tabIndex={0}
            withUnderline
          >
            {dayjs(selectedStartDate).format(MONTH_DAY_COMPACT_FORMAT)}
          </Text>
        )}
      </StyledDateFlex>

      {isAllDay && (
        <StyledDateFlex alignItems={AlignItems.CENTER}>
          {isEndDatePickerShown ? (
            <div
              onMouseUp={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <DatePicker
                autoFocus
                defaultOpen
                onCalendarClose={closeEndDatePicker}
                onClickOutside={closeEndDatePicker}
                onChange={() => null}
                onKeyDown={onEndDatePickerKeyDown}
                onSelect={onSelectEndDate}
                selected={selectedEndDate}
              />
            </div>
          ) : (
            <Text
              onClick={openEndDatePicker}
              onFocus={() => isEndDatePickerShown && openEndDatePicker}
              role="tab"
              tabIndex={0}
              withUnderline
            >
              {dayjs(selectedEndDate).format(MONTH_DAY_COMPACT_FORMAT)}
            </Text>
          )}
        </StyledDateFlex>
      )}

      {!isAllDay && (
        <StyledTimeFlex alignItems={AlignItems.CENTER}>
          <TimePicker
            autoFocus={autoFocusedTimePicker === "start"}
            bgColor={pickerBgColor}
            value={startTime}
            inputId="startTimePicker"
            onChange={onSelectStartTime}
            openMenuOnFocus
            options={timeOptions}
          />
          -
          <TimePicker
            autoFocus={autoFocusedTimePicker === "end"}
            bgColor={pickerBgColor}
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

//++
// const Menu = (props: MenuProps<false>) => {
//   const handleScroll = () => {
//     console.log("scrolling");
//   };

//   return (
//     <components.Menu {...props} innerProps={{ onScroll: handleScroll }}>
//       {props.children}
//     </components.Menu>
//   );
// };

/*
  const onTimePickerBlur = (e: React.FocusEvent<HTMLElement>) => {
    const relatedTarget = e.relatedTarget as RelatedTargetElement;

    if (relatedTarget?.id === "startTimePicker") {
      setIsEndTimePickerOpen(true);
    }

    if (
      relatedTarget?.id === "endTimePicker" ||
      relatedTarget?.id === "startTimePicker"
    )
      return;

    // closeAllTimePickers();
  };
*/
/*
const findOption = () => {
  const endOption = timeOptions.find((option) => {
    const optionMoment = dayjs(`2000-00-00 ${option.value}`, YMDHM_FORMAT);
    const start = dayjs(`2000-00-00 ${value.value}`, YMDHM_FORMAT);
    const startTimeMomentAdded = start.add(30, "minute");

    return optionMoment.isSame(startTimeMomentAdded);
  });
};

*/
