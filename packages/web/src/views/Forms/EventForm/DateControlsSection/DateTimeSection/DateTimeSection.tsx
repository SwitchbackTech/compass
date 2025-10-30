import React, { FC } from "react";
import { Schema_Event } from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";
import { Categories_Event } from "@web/common/types/web.event.types";
import { AlignItems } from "@web/components/Flex/styled";
import { DatePickers } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/DatePickers/DatePickers";
import { TimePickers } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/TimePicker/TimePickers";
import { StyledDateTimeFlex } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/styled";
import { SetEventFormField } from "@web/views/Forms/EventForm/types";

export interface Props {
  bgColor: string;
  category: Categories_Event;
  displayEndDate: Date;
  event: Schema_Event;
  endTime: SelectOption<string>;
  inputColor?: string;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  onSetEventField: SetEventFormField;
  selectedEndDate: Date;
  selectedStartDate: Date;
  setDisplayEndDate: (value: Date) => void;
  setEndTime: (value: SelectOption<string>) => void;
  setIsEndDatePickerOpen: (arg0: boolean) => void;
  setIsStartDatePickerOpen: (arg0: boolean) => void;
  setSelectedEndDate: (value: Date) => void;
  setSelectedStartDate: (value: Date) => void;
  setStartTime: (value: SelectOption<string>) => void;
  setEvent: (event: Schema_Event) => React.SetStateAction<Schema_Event> | void;
  startTime: SelectOption<string>;
}

export const DateTimeSection: FC<Props> = ({
  bgColor,
  category,
  displayEndDate,
  event,
  inputColor,
  isEndDatePickerOpen,
  isStartDatePickerOpen,
  selectedEndDate,
  selectedStartDate,
  onSetEventField,
  setDisplayEndDate,
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
          displayEndDate={displayEndDate}
          inputColor={inputColor}
          isEndDatePickerOpen={isEndDatePickerOpen}
          isStartDatePickerOpen={isStartDatePickerOpen}
          selectedEndDate={selectedEndDate}
          selectedStartDate={selectedStartDate}
          onSetEventField={onSetEventField}
          setDisplayEndDate={setDisplayEndDate}
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
