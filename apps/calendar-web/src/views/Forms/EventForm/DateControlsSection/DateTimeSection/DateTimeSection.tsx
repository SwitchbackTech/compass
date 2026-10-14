import { type FC } from "react";
import { type SelectOption } from "@web/common/types/component.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { DatePickers } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/DatePickers/DatePickers";
import { TimePickers } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/TimePicker/TimePickers";
import { type OnEventFormScheduleChange } from "@web/views/Forms/EventForm/types";

export interface Props {
  displayEndDate: Date;
  draft: GridEventDraft;
  endTime: SelectOption<string>;
  isEndDatePickerOpen: boolean;
  isStartDatePickerOpen: boolean;
  onScheduleChange: OnEventFormScheduleChange;
  scheduleEnd: Date;
  scheduleStart: Date;
  selectedEndDate: Date;
  selectedStartDate: Date;
  setIsEndDatePickerOpen: (arg0: boolean) => void;
  setIsStartDatePickerOpen: (arg0: boolean) => void;
  startTime: SelectOption<string>;
}

export const DateTimeSection: FC<Props> = ({
  displayEndDate,
  draft,
  isEndDatePickerOpen,
  isStartDatePickerOpen,
  selectedEndDate,
  selectedStartDate,
  onScheduleChange,
  scheduleEnd,
  scheduleStart,
  setIsStartDatePickerOpen,
  setIsEndDatePickerOpen,
  startTime,
  endTime,
}) => {
  const isAllDay = draft.values.schedule.kind === "allDay";

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {isAllDay && (
        <div className="flex items-center gap-2">
          <DatePickers
            displayEndDate={displayEndDate}
            draft={draft}
            isEndDatePickerOpen={isEndDatePickerOpen}
            isStartDatePickerOpen={isStartDatePickerOpen}
            selectedEndDate={selectedEndDate}
            selectedStartDate={selectedStartDate}
            onScheduleChange={onScheduleChange}
            setIsEndDatePickerOpen={setIsEndDatePickerOpen}
            setIsStartDatePickerOpen={setIsStartDatePickerOpen}
          />
        </div>
      )}

      {!isAllDay && (
        <TimePickers
          endTime={endTime}
          onScheduleChange={onScheduleChange}
          scheduleEnd={scheduleEnd}
          scheduleStart={scheduleStart}
          startTime={startTime}
          selectedEndDate={selectedEndDate}
          selectedStartDate={selectedStartDate}
        />
      )}
    </div>
  );
};
