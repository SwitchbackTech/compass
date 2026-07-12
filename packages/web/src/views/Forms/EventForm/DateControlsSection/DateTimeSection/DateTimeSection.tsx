import { type FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { type SelectOption } from "@web/common/types/component.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { DatePickers } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/DatePickers/DatePickers";
import { TimePickers } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/TimePicker/TimePickers";
import { type SetEventFormField } from "@web/views/Forms/EventForm/types";

export interface Props {
  bgColor: string;
  category: Categories_Event;
  displayEndDate: Date;
  draft: GridEventDraft;
  endTime: SelectOption<string>;
  inputColor?: string;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  onSetEventField: SetEventFormField;
  selectedEndDate: Date;
  selectedStartDate: Date;
  setDisplayEndDate: (value: Date) => void;
  setDraft: (draft: GridEventDraft) => void;
  setEndTime: (value: SelectOption<string>) => void;
  setIsEndDatePickerOpen: (arg0: boolean) => void;
  setIsStartDatePickerOpen: (arg0: boolean) => void;
  setSelectedEndDate: (value: Date) => void;
  setSelectedStartDate: (value: Date) => void;
  setStartTime: (value: SelectOption<string>) => void;
  startTime: SelectOption<string>;
}

export const DateTimeSection: FC<Props> = ({
  bgColor,
  category,
  displayEndDate,
  draft,
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
  setDraft,
  startTime,
  endTime,
}) => {
  return (
    <div className="flex items-center gap-2" role="tablist">
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
          draft={draft}
          endTime={endTime}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          setDraft={setDraft}
          startTime={startTime}
          selectedEndDate={selectedEndDate}
          selectedStartDate={selectedStartDate}
        />
      )}
    </div>
  );
};
