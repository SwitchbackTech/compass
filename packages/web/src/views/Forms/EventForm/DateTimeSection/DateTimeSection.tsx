import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React, { FC, SetStateAction } from "react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";
import { AlignItems } from "@web/components/Flex/styled";
import { DatePickers } from "./DatePickers/DatePickers";
import { TimePickers } from "./TimePicker/TimePickers";
import { StyledDateTimeFlex } from "./styled";

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
        <TimePickers
          bgColor={bgColor}
          endTime={endTime}
          event={event}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          setEvent={setEvent}
          startTime={startTime}
          selectedEndDate={selectedEndDate}
          selectedStartDate={selectedStartDate}
        />
      )}
    </StyledDateTimeFlex>
  );
};
