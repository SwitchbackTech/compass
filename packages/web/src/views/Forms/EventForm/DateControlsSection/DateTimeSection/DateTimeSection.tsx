import { type FC } from "react";
import { type SelectOption } from "@web/common/types/component.types";
import { Categories_Event } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { DatePickers } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/DatePickers/DatePickers";
import { TimePickers } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/TimePicker/TimePickers";
import { type SetEventFormSchedule } from "@web/views/Forms/EventForm/types";

export interface Props {
  category: Categories_Event;
  displayEndDate: Date;
  draft: GridEventDraft;
  endTime: SelectOption<string>;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  onSetScheduleField: SetEventFormSchedule;
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
  category,
  displayEndDate,
  draft,
  isEndDatePickerOpen,
  isStartDatePickerOpen,
  selectedEndDate,
  selectedStartDate,
  onSetScheduleField,
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
    <div className="flex items-center gap-2">
      {category === Categories_Event.ALLDAY && (
        <DatePickers
          displayEndDate={displayEndDate}
          isEndDatePickerOpen={isEndDatePickerOpen}
          isStartDatePickerOpen={isStartDatePickerOpen}
          selectedEndDate={selectedEndDate}
          selectedStartDate={selectedStartDate}
          onSetScheduleField={onSetScheduleField}
          setDisplayEndDate={setDisplayEndDate}
          setSelectedEndDate={setSelectedEndDate}
          setSelectedStartDate={setSelectedStartDate}
          setIsEndDatePickerOpen={setIsEndDatePickerOpen}
          setIsStartDatePickerOpen={setIsStartDatePickerOpen}
        />
      )}

      {category === Categories_Event.TIMED && (
        <TimePickers
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
